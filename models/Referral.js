import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
    {
        referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        // A person can only ever be referred once -> unique.
        refereeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        code: { type: String, required: true },
        status: { type: String, enum: ['pending', 'rewarded', 'rejected'], default: 'pending' },
        referrerReward: { type: Number, default: 0 },
        refereeReward: { type: Number, default: 0 },
        rewardedAt: Date,
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        rejectReason: String
    },
    { timestamps: true }
);

export default mongoose.model('Referral', referralSchema);