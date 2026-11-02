import mongoose from 'mongoose';

const referralSettingSchema = new mongoose.Schema(
    {
        key: { type: String, default: 'default', unique: true },
        enabled: { type: Boolean, default: true },
        referrerReward: { type: Number, default: 100, min: 0 },
        refereeReward: { type: Number, default: 50, min: 0 },
        // Referee's first delivered order must be at least this much (0 = any).
        minOrderValue: { type: Number, default: 0, min: 0 },
        // Max rewarded referrals per referrer (0 = unlimited).
        maxRewardsPerReferrer: { type: Number, default: 0, min: 0 }
    },
    { timestamps: true }
);

export default mongoose.model('ReferralSetting', referralSettingSchema);