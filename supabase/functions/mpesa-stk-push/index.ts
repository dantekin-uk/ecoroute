import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Hono } from "https://esm.sh/hono@3.11.7";

const app = new Hono();

interface STK Push Initiation Function
// Function to generate access token
async function generateAccessToken(consumerKey: string, consumerSecret: string) {
  const credentials = btoa(`${consumerKey}:${consumerSecret});
  const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    method: "GET",
    headers: { Authorization: `Basic ${credentials}` },
  });
  const data = await response.json();
  return data.access_token;
}

async function initiateSTKPush(
  accessToken: string,
  businessShortCode: string,
  passkey: string,
  amount: number,
  phoneNumber: string,
  partyA: string,
  partyB: string,
  accountReference: string,
  transactionDesc: string,
  callBackUrl: string,
) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  const password = btoa(`${businessShortCode}${passkey}${timestamp});
  
  const requestBody = {
    BusinessShortCode: businessShortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phoneNumber,
    PartyB: businessShortCode,
    PhoneNumber: phoneNumber,
    CallBackURL: callBackUrl,
    AccountReference: accountReference,
    TransactionDesc: transactionDesc,
  };

  const response = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(requestBody),
  });

  return await response.json();
}

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    
    // Get environment variables
    const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY")!;
    const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET")!;
    const businessShortCode = Deno.env.get("DARAJA_SHORT_CODE")!;
    const passkey = Deno.env.get("DARAJA_PASSKEY")!;
    const callBackUrl = Deno.env.get("DARAJA_CALLBACK_URL")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initiate STK Push
    const accessToken = await generateAccessToken(consumerKey, consumerSecret);
    const stkResponse = await initiateSTKPush(
      accessToken,
      businessShortCode,
      passkey,
      body.amount,
      body.phoneNumber,
      body.phoneNumber,
      businessShortCode,
      body.houseNumber,
      `Rent Payment - ${body.houseNumber}`,
      callBackUrl,
    );

    // Create pending transaction in Supabase
    await supabase.from("transactions").insert({
      user_id: body.userId,
      house_number: body.houseNumber,
      estate_name: body.estateName,
      amount: body.amount,
      payment_method: "M-Pesa (Pending)",
      collector_name: "M-Pesa",
      resulting_balance: body.currentBalance,
      transaction_id: stkResponse.CheckoutRequestID,
    });

    return c.json({
      success: true, stkResponse });
  } catch (error) {
    console.error("Error initiating STK Push:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

serve(app.fetch);
