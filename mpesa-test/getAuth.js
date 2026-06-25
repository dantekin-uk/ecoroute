const axios = require('axios');

const consumerKey = 'WYBSm62pRRjMSzEJ8UBPXsxGkVzvvGZGLyHH1JFjeUGc0szN';
const consumerSecret = 'VKUuOWcKXArvFB6Ftg8d4rgCNGdwvX5KSi9ytw7h5H3oADoZymOT7coOU299Nv3v';

const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

async function getAccessToken() {
    try {
        const response = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`
                }
            }
        );
        console.log("✅ SUCCESS! Your Access Token is:", response.data.access_token);
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Error getting token:", error.response ? error.response.data : error.message);
    }
}

getAccessToken();
