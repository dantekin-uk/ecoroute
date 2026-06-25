const axios = require('axios');

// Your Daraja Sandbox Credentials
const consumerKey = 'WYBSm62pRRjMSzEJ8UBPXsxGkVzvvGZGLyHH1JFjeUGc0szN';
const consumerSecret = 'VKUuOWcKXArvFB6Ftg8d4rgCNGdwvX5KSi9ytw7h5H3oADoZymOT7coOU299Nv3v';
const businessShortCode = '174379'; // Default Lipa Na M-Pesa Sandbox Shortcode
const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e627edbccb3c29a5'; // Default sandbox passkey
const testPhoneNumber = '254708374149'; // Test Phone Number
const testAmount = 1; // Test with KSh 1
const callbackUrl = 'https://example.com/callback'; // We'll update this later for webhooks

// Get Access Token
async function getAccessToken() {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
}

// Initiate STK Push
async function initiateSTKPush() {
    try {
        const accessToken = await getAccessToken();
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
        const password = Buffer.from(`${businessShortCode}${passkey}${timestamp}`).toString('base64');

        const requestBody = {
            BusinessShortCode: businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: testAmount,
            PartyA: testPhoneNumber,
            PartyB: businessShortCode,
            PhoneNumber: testPhoneNumber,
            CallBackURL: callbackUrl,
            AccountReference: 'TEST_ACCOUNT_123',
            TransactionDesc: 'Test Payment'
        };

        console.log('🚀 Initiating STK Push...');
        console.log('Request Payload:', requestBody);

        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            requestBody,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        console.log('✅ STK Push Initiated Successfully!');
        console.log('Response:', response.data);
    } catch (error) {
        console.error('❌ STK Push Failed:', error.response ? error.response.data : error.message);
    }
}

initiateSTKPush();
