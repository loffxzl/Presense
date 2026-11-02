// services/admin/walletService.js
import * as walletRepository from '../../repositories/walletRepository.js';

export const listWallets = async ({ page = 1, limit = 10, search = '' } = {}) => {
    const currentPage = Math.max(1, parseInt(page) || 1);
    const skip = (currentPage - 1) * limit;

    const { rows, total, totalBalance } = await walletRepository.findWallets({
        search: search.trim(),
        skip,
        limit
    });

    const wallets = rows.map((w) => {
        const u = w.user || {};
        const name = u.name || u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ') || '';
        return {
            userId: w.userId,
            name: name || '(no name)',
            email: u.email || '—',
            balance: w.balance,
            updatedAt: w.updatedAt
        };
    });

    return {
        wallets,
        currentPage,
        totalPages: Math.ceil(total / limit) || 1,
        totalWallets: total,
        totalBalance,
        search
    };
};

export const getUserTransactions = async ({ userId, page = 1, limit = 20 }) => {
    const currentPage = Math.max(1, parseInt(page) || 1);
    const skip = (currentPage - 1) * limit;

    const [transactions, total] = await Promise.all([
        walletRepository.findTransactionsByUser({ userId, skip, limit }),
        walletRepository.countTransactionsByUser(userId)
    ]);

    return { transactions, currentPage, totalPages: Math.ceil(total / limit) || 1 };
};