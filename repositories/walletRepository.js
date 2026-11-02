// repositories/walletRepository.js
import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';

export const findWalletByUser = async (userId) => {
    return await Wallet.findOne({ userId });
};

// Atomic $inc; creates the wallet on a user's first credit.
export const creditBalance = async (userId, amount) => {
    return await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { balance: amount } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
};


export const debitBalance = async (userId, amount) => {
    return await Wallet.findOneAndUpdate(
        { userId, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true }
    );
};

export const createTransaction = async (data) => {
    return await WalletTransaction.create(data);
};

export const setTransactionBalanceAfter = async (transactionId, balanceAfter) => {
    return await WalletTransaction.findByIdAndUpdate(transactionId, { balanceAfter });
};

export const deleteTransaction = async (transactionId) => {
    return await WalletTransaction.findByIdAndDelete(transactionId);
};

export const findTransactionsByUser = async ({ userId, skip = 0, limit = 10 }) => {
    return await WalletTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('orderId', 'orderCode')
        .lean();
};

export const countTransactionsByUser = async (userId) => {
    return await WalletTransaction.countDocuments({ userId });
};

// Admin: wallets joined with their owner. 'users' is the collection Mongoose
// creates for the User model. The name fields are all optional in the
// projection because different schemas call them different things.
export const findWallets = async ({ search = '', skip = 0, limit = 10 } = {}) => {
    const pipeline = [
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
    ];

    if (search) {
        const rx = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
        pipeline.push({
            $match: {
                $or: [
                    { 'user.email': rx },
                    { 'user.name': rx },
                    { 'user.fullName': rx },
                    { 'user.firstName': rx },
                    { 'user.lastName': rx }
                ]
            }
        });
    }

    pipeline.push({ $sort: { updatedAt: -1 } });
    pipeline.push({
        $facet: {
            rows: [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        balance: 1,
                        updatedAt: 1,
                        userId: 1,
                        'user.name': 1,
                        'user.fullName': 1,
                        'user.firstName': 1,
                        'user.lastName': 1,
                        'user.email': 1
                    }
                }
            ],
            total: [{ $count: 'n' }],
            sum: [{ $group: { _id: null, total: { $sum: '$balance' } } }]
        }
    });

    const [result] = await Wallet.aggregate(pipeline);
    return {
        rows: result.rows,
        total: result.total[0] ? result.total[0].n : 0,
        totalBalance: result.sum[0] ? result.sum[0].total : 0
    };
};