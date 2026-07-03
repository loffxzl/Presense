import * as addressService from '../../services/addressService.js';

export const getAddressesPage = async (req, res) => {
  try {
    const addresses = await addressService.getAddresses(req.user._id);
    res.render('user/addresses', {
      title: 'My Addresses',
      user: req.user,
      addresses,
      error: null,
      success: null
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

export const addAddress = async (req, res) => {
  try {
    const data = {
      ...req.body,
      isDefault: req.body.isDefault === 'on'
    };
    await addressService.addAddress(req.user._id, data);
    res.redirect('/profile/addresses?success=Address added successfully');
  } catch (err) {
    const addresses = await addressService.getAddresses(req.user._id);
    res.render('user/addresses', {
      title: 'My Addresses',
      user: req.user,
      addresses,
      error: err.message,
      success: null
    });
  }
};

export const updateAddress = async (req, res) => {
  try {
    const data = {
      ...req.body,
      isDefault: req.body.isDefault === 'on'
    };
    await addressService.updateAddress(req.user._id, req.params.id, data);
    res.redirect('/profile/addresses?success=Address updated successfully');
  } catch (err) {
    const addresses = await addressService.getAddresses(req.user._id);
    res.render('user/addresses', {
      title: 'My Addresses',
      user: req.user,
      addresses,
      error: err.message,
      success: null
    });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    await addressService.deleteAddress(req.user._id, req.params.id);
    res.redirect('/profile/addresses?success=Address deleted successfully');
  } catch (err) {
    res.redirect('/profile/addresses?error=' + err.message);
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    await addressService.setDefaultAddress(req.user._id, req.params.id);
    res.redirect('/profile/addresses?success=Default address updated');
  } catch (err) {
    res.redirect('/profile/addresses?error=' + err.message);
  }
};