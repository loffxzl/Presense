import User from '../models/User.js';


const sortAddresses = (addresses) => {
    return [...addresses].sort((a, b) => {
        if (a.isDefault !== b.isDefault) return b.isDefault - a.isDefault;
        return b.createdAt - a.createdAt;
    });
};

export const findAddressesByUser = async (userId) => {
    const user = await User.findById(userId).select('addresses');
    if (!user) return [];
    return sortAddresses(user.addresses);
};


export const findAddressById = async (userId, addressId) => {
    const user = await User.findById(userId).select('addresses');
    if (!user) return null;
    return user.addresses.id(addressId) || null;
};

export const createAddress = async (userId, data) => {
    const user = await User.findById(userId);
    if (!user) return null;
    user.addresses.push(data);
    await user.save();
    return user.addresses[user.addresses.length - 1];
};

export const updateAddress = async (userId, addressId, data) => {
    const user = await User.findById(userId);
    if (!user) return null;
    const address = user.addresses.id(addressId);
    if (!address) return null;
    address.set(data);
    await user.save();
    return address;
};

export const deleteAddress = async (userId, addressId) => {
    const user = await User.findById(userId);
    if (!user) return null;
    const address = user.addresses.id(addressId);
    if (!address) return null;
    address.deleteOne();
    await user.save();
    return true;
};


export const unsetDefaultForUser = async (userId, exceptAddressId = null) => {
    const user = await User.findById(userId);
    if (!user) return null;
    user.addresses.forEach((addr) => {
        if (!exceptAddressId || addr._id.toString() !== String(exceptAddressId)) {
            addr.isDefault = false;
        }
    });
    await user.save();
    return user;
};

export const countAddressesByUser = async (userId) => {
    const user = await User.findById(userId).select('addresses');
    return user ? user.addresses.length : 0;
};