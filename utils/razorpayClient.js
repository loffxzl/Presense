// utils/razorpayClient.js
import crypto from 'crypto';
import Razorpay from 'razorpay';
import AppError from './AppError.js';

// Built lazily (not at import time) so a missing key only fails the payment
// request, never app startup, and so dotenv has certainly loaded by then.
export const getRazorpayClient = () => {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new AppError('Online payments are not configured', 500);
    }
    return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
};

// Razorpay's signature = HMAC-SHA256(key_secret, "<order_id>|<payment_id>").
// Only someone holding the secret can produce a matching one, which is what
// stops a user from faking a "payment successful" request.
export const isValidSignature = (razorpayOrderId, razorpayPaymentId, signature) => {
    const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};