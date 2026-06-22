import User from '../models/User.js';

const baseFilter = {role:'user'};

export const findUsers = async ({filter , skip , limit , sort}) => {
    return User.find({ ...baseFilter, ...filter})
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select('name email status createdAt');
};

export const countUsers = async (filter) => {
    return User.countDocuments({...baseFilter , ...filter});
};

export const findUserById = async (id) => {
    return User.findOne({ _id:id,role:'user'});
};

export const updateUserStatus = async (id, status) => {
    return User.findByIdAndUpdate(id ,{status} , {new: true});
};

