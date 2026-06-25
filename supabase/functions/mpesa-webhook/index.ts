import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Hono } from "https://esm.sh/hono@3.11.7";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const callbackData = await c.req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract data from callback
    const stkCallback = callbackData.Body.stkCallback;
    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // Find the pending transaction
    const { data: pendingTx } = await supabase
      .from("transactions")
      .select("*, tenants(block_number, door_number)")
      .eq("transaction_id", checkoutRequestId)
      .single();

    if (pendingTx) {
      if (resultCode === 0) {
        // Payment successful!
        const amount = stkCallback.CallbackMetadata.Item.find(
          (item: any) => item.Name === "Amount"
        ).Value;
        
        const mpesaReceiptNumber = stkCallback.CallbackMetadata.Item.find(
          (item: any) => item.Name === "MpesaReceiptNumber"
        ).Value;

        // Update transaction to successful
        await supabase
          .from("transactions")
          .update({
            payment_method: `M-Pesa - ${mpesaReceiptNumber}`,
            amount: amount,
          })
          .eq("id", pendingTx.id);

        // Update tenant's balance
        const { data: tenant } = await supabase
          .from("tenants")
          .select("id, current_balance")
          .eq("id", pendingTx.tenant_id)
          .single();
        
        if (tenant) {
          const newBalance = tenant.current_balance + amount;
          await supabase
            .from("tenants")
            .update({ current_balance: newBalance })
            .eq("id", tenant.id);
        }
      } else {
        // Payment failed
        await supabase
          .from("transactions")
          .update({
            payment_method: "M-Pesa (Failed)",
          })
          .eq("id", pendingTx.id);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error processing M-Pesa callback:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

serve(app.fetch);
