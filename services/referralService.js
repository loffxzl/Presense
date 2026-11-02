// services/referralService.js
import crypto from 'crypto';
import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import * as referralRepository from '../repositories/referralRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import * as walletService from './user/walletService.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const CODE_LENGTH = 7;

export const cleanCode = (raw) =>
    String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

const randomCode = () => {
    const bytes = crypto.randomBytes(CODE_LENGTH);
    let out = '';
    for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
};

// A code nobody else owns. (The User.referralCode unique index is the real guard.)
export const generateUniqueCode = async () => {
    for (let i = 0; i < 8; i++) {
        const code = randomCode();
        const taken = await referralRepository.findUserByReferralCode(code);
        if (!taken) return code;
    }
    throw new AppError('Could not generate a referral code, please try again', 500);
};

// Old users have no code yet -> give them one the first time it is needed.
export const ensureReferralCode = async (user) => {
    if (user.referralCode) return user.referralCode;
    for (let i = 0; i < 3; i++) {
        const code = await generateUniqueCode();
        try {
            const updated = await referralRepository.setReferralCode(user._id, code);
            if (updated?.referralCode) return updated.referralCode;
            const fresh = await referralRepository.findUserBasic(user._id); // someone else set it
            if (fresh?.referralCode) return fresh.referralCode;
        } catch (err) {
            if (err.code !== 11000) throw err; // code collision -> try another
        }
    }
    // Developer detail goes to the server log only, never to the customer.
    console.error('ensureReferralCode: code was not saved for user', String(user._id), '- is referralCode in the User schema?');
    throw new AppError('We could not load your referral code right now. Please try again later.', 500);
};

// ---------------------------------------------------------------- settings
export const getSettings = () => referralRepository.getSettings();

export const updateSettings = async (body) => {
    const num = (v, label) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) throw new AppError(`${label} must be 0 or more`, 400);
        return Math.round(n * 100) / 100;
    };
    const data = {
        enabled: body.enabled === 'on' || body.enabled === 'true' || body.enabled === true,
        referrerReward: num(body.referrerReward, 'Referrer reward'),
        refereeReward: num(body.refereeReward, 'New-user reward'),
        minOrderValue: num(body.minOrderValue || 0, 'Minimum order value'),
        maxRewardsPerReferrer: Math.floor(num(body.maxRewardsPerReferrer || 0, 'Referral limit'))
    };
    if (data.referrerReward > 5000 || data.refereeReward > 5000) {
        throw new AppError('Rewards above ₹5000 are not allowed', 400);
    }
    return referralRepository.saveSettings(data);
};

// ---------------------------------------------------------------- signup
// Returns the referrer (or null when no/ignored code). strict = email signup:
// a typed code that does not exist is an error the user should see.
export const resolveReferrer = async (rawCode, { strict = false } = {}) => {
    const code = cleanCode(rawCode);
    if (!code) return null;

    const settings = await referralRepository.getSettings();
    if (!settings.enabled) return null;

    const referrer = await referralRepository.findUserByReferralCode(code);
    if (!referrer || referrer.status === 'blocked') {
        if (strict) throw new Error('Invalid referral code');
        return null;
    }
    return referrer;
};

// Called once, right after a brand-new user is created.
export const attachReferral = async (newUser, referrer) => {
    if (!referrer) return null;
    if (String(referrer._id) === String(newUser._id)) return null; // self-referral
    try {
        const referral = await referralRepository.createReferral({
            referrerId: referrer._id,
            refereeId: newUser._id,
            code: referrer.referralCode
        });
        await userRepository.updateUserById(newUser._id, { referredBy: referrer._id });
        return referral;
    } catch (err) {
        if (err.code === 11000) return null; // already referred
        throw err;
    }
};

// ---------------------------------------------------------------- reward
// Call after an order is marked delivered. Safe to call repeatedly:
// only the referee's first qualifying delivered order pays out, once.
export const rewardOnDelivery = async (order) => {
    const settings = await referralRepository.getSettings();
    if (!settings.enabled) return null;

    const referral = await referralRepository.findByReferee(order.userId);
    if (!referral || referral.status !== 'pending') return null;

    const orderTotal = order.pricing?.total || 0;
    if (settings.minOrderValue > 0 && orderTotal < settings.minOrderValue) return null; // stays pending

    if (settings.maxRewardsPerReferrer > 0) {
        const done = await referralRepository.countRewardedForReferrer(referral.referrerId);
        if (done >= settings.maxRewardsPerReferrer) {
            await referralRepository.rejectPending(order.userId, 'Referrer reached the referral limit');
            return null;
        }
    }

    // Only one caller can win this switch.
    const claimed = await referralRepository.claimPending(order.userId, {
        rewardedAt: new Date(),
        orderId: order._id,
        referrerReward: settings.referrerReward,
        refereeReward: settings.refereeReward
    });
    if (!claimed) return null;

    try {
        // refKeys make each credit idempotent, so a retry never pays twice.
        if (settings.referrerReward > 0) {
            await walletService.creditWallet({
                userId: claimed.referrerId,
                amount: settings.referrerReward,
                reason: 'referral_reward',
                orderId: order._id,
                refKey: `referral:${claimed._id}:referrer`,
                description: 'Referral reward: your friend received their first order'
            });
        }
        if (settings.refereeReward > 0) {
            await walletService.creditWallet({
                userId: claimed.refereeId,
                amount: settings.refereeReward,
                reason: 'referral_reward',
                orderId: order._id,
                refKey: `referral:${claimed._id}:referee`,
                description: 'Welcome reward for joining with a referral code'
            });
        }
    } catch (err) {
        await referralRepository.revertToPending(claimed._id); // next delivery retries
        throw err;
    }
    return claimed;
};

// ---------------------------------------------------------------- user page
export const getUserSummary = async (user) => {
    const code = await ensureReferralCode(user);
    const userId = new mongoose.Types.ObjectId(String(user._id));
    const [settings, stats, referrals] = await Promise.all([
        referralRepository.getSettings(),
        referralRepository.statsForReferrer(userId),
        referralRepository.listForReferrer(userId)
    ]);
    const base = (process.env.BASE_URL || '').replace(/\/$/, '');
    return {
        code,
        link: `${base}/auth/signup?ref=${code}`,
        settings,
        stats,
        referrals: referrals.map((r) => ({
            name: r.refereeId?.name || 'Friend',
            status: r.status,
            reward: r.status === 'rewarded' ? r.referrerReward : 0,
            joinedAt: r.createdAt
        }))
    };
};

// ---------------------------------------------------------------- admin page
export const getAdminOverview = async ({ page = 1, status = '', limit = 10 } = {}) => {
    const filter = ['pending', 'rewarded', 'rejected'].includes(status) ? { status } : {};
    const currentPage = Math.max(1, parseInt(page) || 1);
    const [[referrals, total], totals, settings] = await Promise.all([
        referralRepository.listAll({ filter, skip: (currentPage - 1) * limit, limit }),
        referralRepository.adminTotals(),
        referralRepository.getSettings()
    ]);
    return {
        referrals,
        totals,
        settings,
        status,
        currentPage,
        totalPages: Math.ceil(total / limit) || 1
    };
};