// models/WalletTransaction.js
import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: ['credit', 'debit'], required: true },
        amount: { type: Number, required: true, min: 0.01 },
        reason: {
            type: String,
            enum: ['refund_cancel', 'refund_return', 'order_payment', 'order_payment_reversal', 'topup', 'referral_reward'],
            required: true
        },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

        refKey: { type: String, unique: true, sparse: true },

        description: { type: String, trim: true },
        balanceAfter: { type: Number }
    },
    { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('WalletTransaction', walletTransactionSchema);