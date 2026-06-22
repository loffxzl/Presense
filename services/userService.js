import * as userRepository from '../repositories/userRepository.js';

export const getUserList = async ({ page = 1, limit = 10, search = '' }) => {
  const filter = {};
  if (search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const currentPage = Math.max(1, parseInt(page));
  const skip = (currentPage - 1) * limit;
  const sort = { createdAt: -1 };

  const [users, totalUsers] = await Promise.all([
    userRepository.findUsers({ filter, skip, limit, sort }),
    userRepository.countUsers(filter)
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  return { users, currentPage, totalPages, totalUsers, search };
};

export const toggleUserStatus = async (id) => {
  const user = await userRepository.findUserById(id);
  if (!user) throw new Error('User not found');

  const newStatus = user.status === 'active' ? 'blocked' : 'active';
  return userRepository.updateUserStatus(id, newStatus);
};