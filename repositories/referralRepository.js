import Referral from '../models/Referral.js';
import ReferralSetting from '../models/ReferralSetting.js';
import User from '../models/User.js';

export const getSettings = async () => {
    const doc = await ReferralSetting.findOne({ key: 'default' }).lean();
    return doc || { enabled: true, referrerReward: 100, refereeReward: 50, minOrderValue: 0, maxRewardsPerReferrer: 0 };
};

export const saveSettings = (data) =>
    ReferralSetting.findOneAndUpdate({ key: 'default' }, { $set: data }, { upsert: true, new: true, setDefaultsOnInsert: true });

export const findUserByReferralCode = (code) =>
    User.findOne({ referralCode: code, role: 'user' }).select('_id name status referralCode');

export const findUserBasic = (id) => User.findById(id).select('_id name referralCode');

export const setReferralCode = (userId, code) =>
    // Only set if still empty -> safe under concurrency.
    User.findOneAndUpdate(
        { _id: userId, $or: [{ referralCode: { $exists: false } }, { referralCode: null }] },
        { $set: { referralCode: code } },
        { new: true }
    );

export const createReferral = (data) => Referral.create(data);

export const findByReferee = (refereeId) => Referral.findOne({ refereeId });

// Atomically move pending -> rewarded. Only one caller can win.
export const claimPending = (refereeId, update) =>
    Referral.findOneAndUpdate({ refereeId, status: 'pending' }, { $set: { status: 'rewarded', ...update } }, { new: true });

export const revertToPending = (id) =>
    Referral.updateOne({ _id: id }, { $set: { status: 'pending' }, $unset: { rewardedAt: 1, orderId: 1 } });

export const rejectPending = (refereeId, reason) =>
    Referral.updateOne({ refereeId, status: 'pending' }, { $set: { status: 'rejected', rejectReason: reason } });

export const countRewardedForReferrer = (referrerId) => Referral.countDocuments({ referrerId, status: 'rewarded' });

export const listForReferrer = (referrerId) =>
    Referral.find({ referrerId }).sort({ createdAt: -1 }).limit(50).populate('refereeId', 'name').lean();

export const statsForReferrer = async (referrerId) => {
    const [row] = await Referral.aggregate([
        { $match: { referrerId } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                rewarded: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } },
                earned: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, '$referrerReward', 0] } }
            }
        }
    ]);
    return row || { total: 0, rewarded: 0, earned: 0 };
};

export const listAll = async ({ filter, skip, limit }) =>
    Promise.all([
        Referral.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
            .populate('referrerId', 'name email').populate('refereeId', 'name email').lean(),
        Referral.countDocuments(filter)
    ]);

export const adminTotals = async () => {
    const [row] = await Referral.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                rewarded: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } },
                paidOut: {
                    $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, { $add: ['$referrerReward', '$refereeReward'] }, 0] }
                }
            }
        }
    ]);
    return row || { total: 0, rewarded: 0, paidOut: 0 };
};