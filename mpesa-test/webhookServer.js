const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

app.post('/callback', (req, res) => {
    console.log('📨 M-Pesa Callback Received!');
    console.log('Payload:', JSON.stringify(req.body, null, 2));
    res.status(200).json({
        "ResultCode": 0,
        "ResultDesc": "Success"
    });
});

app.listen(port, () => {
    console.log(`🟢 Webhook server running on http://localhost:${port}`);
    console.log('Use ngrok to expose it to the internet!');
});
