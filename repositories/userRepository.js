import User from '../models/User.js';

const baseFilter = { role: 'user' };

export const findUsers = async ({ filter, skip, limit, sort }) => {
  return User.find({ ...baseFilter, ...filter })
    .sort(sort).skip(skip).limit(limit)
    .select('name email status createdAt');
};

export const countUsers = async (filter) => {
  return User.countDocuments({ ...baseFilter, ...filter });
};

export const findUserById = async (id) => {
  return User.findOne({ _id: id, role: 'user' });
};

export const findUserByEmail = async (email) => {
  return User.findOne({ email });
};

export const createUser = async (data) => {
  return User.create(data);
};

export const updateUserById = async (id, data) => {
  return User.findByIdAndUpdate(id, data, { new: true });
};

export const updateUserStatus = async (id, status) => {
  return User.findByIdAndUpdate(id, { status }, { new: true });
};

export const findUserByResetToken = async (token) => {
  return User.findOne({emailVerificationToken:token});
};

export const addAddress = async (userId, address) => {
  return User.findByIdAndUpdate(
    userId,
    { $push: { addresses: address } },
    { new: true }
  );
};

export const updateAddress = async (userId, addressId, data) => {
  const fields = {};
  Object.keys(data).forEach(key => {
    fields[`addresses.$.${key}`] = data[key];
  });
  return User.findOneAndUpdate(
    { _id: userId, 'addresses._id': addressId },
    { $set: fields },
    { new: true }
  );
};

export const deleteAddress = async (userId, addressId) => {
  return User.findByIdAndUpdate(
    userId,
    { $pull: { addresses: { _id: addressId } } },
    { new: true }
  );
};

export const setDefaultAddress = async (userId, addressId) => {
  // First unset all defaults
  await User.updateOne(
    { _id: userId },
    { $set: { 'addresses.$[].isDefault': false } }
  );
  // Then set the selected one
  return User.findOneAndUpdate(
    { _id: userId, 'addresses._id': addressId },
    { $set: { 'addresses.$.isDefault': true } },
    { new: true }
  );
};