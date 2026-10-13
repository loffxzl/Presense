import {catchAsync} from '../../utils/catchAsync.js';
import * as addressService from '../../services/user/addressService.js';

export const getAddresses = catchAsync(async (req, res) => {
    const addresses = await addressService.getAddresses(req.user._id);
    res.status(200).json({ success: true, addresses });
});

export const addAddress = catchAsync(async (req, res) => {
    const user = await addressService.addAddress(req.user._id, req.body);
    res.status(201).json({ success: true, user });
});

export const editAddress = catchAsync(async (req, res) => {
    const user = await addressService.updateAddress(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, user });
});

export const deleteAddress = catchAsync(async (req, res) => {
    const user = await addressService.deleteAddress(req.user._id, req.params.id);
    res.status(200).json({ success: true, user });
});

export const setDefaultAddress = catchAsync(async (req, res) => {
    const user = await addressService.setDefaultAddress(req.user._id, req.params.id);
    res.status(200).json({ success: true, user });
});