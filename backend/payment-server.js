const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 1. Initialize Razorpay with YOUR SECRET KEY
const razorpay = new Razorpay({
    key_id: 'rzp_test_S7Gb21AIbAKorp',
    key_secret: 'hcy4nKuQDBgWAZxTxZ9uvWvV',
});

// 2. Route to create an order (Optional, but recommended)
app.post('/create-order', async (req, res) => {
    try {
        const options = {
            amount: req.body.amount * 100, // amount in smallest currency unit
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).send(error);
    }
});

// 3. Route to VERIFY the payment signature (This is where the Secret Key is used)
app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', 'hcy4nKuQDBgWAZxTxZ9uvWvV')
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // Payment is genuine
        res.json({ status: 'success', message: 'Payment verified successfully' });
    } else {
        // Signature mismatch - Potential Fraud
        res.status(400).json({ status: 'failure', message: 'Invalid signature' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
