import * as walletRepository from '../../repositories/walletRepository.js';
import { getRazorpayClient, isValidSignature } from '../../utils/razorpayClient.js';
import AppError from '../../utils/AppError.js';

const round2 = (n) => Math.round(n * 100) / 100;

const MIN_TOPUP = 10;
const MAX_TOPUP = 50000;

export const getBalance = async (userId) => {
    const wallet = await walletRepository.findWalletByUser(userId);
    return wallet ? wallet.balance : 0;
};

export const getWalletSummary = async (userId, { page = 1, limit = 10 } = {}) => {
    const currentPage = Math.max(1, parseInt(page) || 1);
    const skip = (currentPage - 1) * limit;

    const [balance, transactions, totalTransactions] = await Promise.all([
        getBalance(userId),
        walletRepository.findTransactionsByUser({ userId, skip, limit }),
        walletRepository.countTransactionsByUser(userId)
    ]);

    return {
        balance,
        transactions,
        currentPage,
        totalPages: Math.ceil(totalTransactions / limit) || 1,
        totalTransactions
    };
};


export const creditWallet = async ({ userId, amount, reason, orderId, refKey, description }) => {
    const value = round2(Number(amount));
    if (!(value > 0)) throw new AppError('Invalid wallet amount', 400);


    let transaction;
    try {
        transaction = await walletRepository.createTransaction({
            userId, type: 'credit', amount: value, reason, orderId, refKey, description
        });
    } catch (err) {
        if (err.code === 11000) return { credited: false };
        throw err;
    }

    try {
        const wallet = await walletRepository.creditBalance(userId, value);
        await walletRepository.setTransactionBalanceAfter(transaction._id, wallet.balance);
        return { credited: true, balance: wallet.balance };
    } catch (err) {

        await walletRepository.deleteTransaction(transaction._id);
        throw err;
    }
};



export const debitWallet = async ({ userId, amount, reason, orderId, refKey, description }) => {
    const value = round2(Number(amount));
    if (!(value > 0)) throw new AppError('Invalid wallet amount', 400);

    const wallet = await walletRepository.debitBalance(userId, value);
    if (!wallet) throw new AppError('Your wallet balance is not enough for this order', 409);

    try {
        await walletRepository.createTransaction({
            userId, type: 'debit', amount: value, reason, orderId, refKey, description,
            balanceAfter: wallet.balance
        });
    } catch (err) {

        await walletRepository.creditBalance(userId, value);
        throw err;
    }

    return { balance: wallet.balance };
};



export const createTopupOrder = async (userId, amount) => {
    const rupees = Math.floor(Number(amount));
    if (!Number.isFinite(rupees) || rupees < MIN_TOPUP || rupees > MAX_TOPUP) {
        throw new AppError(`Enter an amount between ₹${MIN_TOPUP} and ₹${MAX_TOPUP}`, 400);
    }

    const rzpOrder = await getRazorpayClient().orders.create({
        amount: rupees * 100, // paise
        currency: 'INR',
        receipt: `wallet_${Date.now()}`,


        notes: { purpose: 'wallet_topup', userId: String(userId) }
    });

    return {
        keyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency
    };
};

export const verifyTopup = async (userId, payload) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new AppError('Missing payment details', 400);
    }

    if (!isValidSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        throw new AppError('Payment verification failed', 400);
    }

    const rzpOrder = await getRazorpayClient().orders.fetch(razorpay_order_id);
    const notes = rzpOrder.notes || {};
    if (notes.purpose !== 'wallet_topup' || notes.userId !== String(userId)) {
        throw new AppError('This payment does not belong to your wallet', 403);
    }

    await creditWallet({
        userId,
        amount: rzpOrder.amount / 100,
        reason: 'topup',
        refKey: `topup:${razorpay_payment_id}`,
        description: 'Wallet top-up'
    });

    return { balance: await getBalance(userId) };
};