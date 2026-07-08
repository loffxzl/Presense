import * as profileService from '../../services/profileService.js';
import * as userRepository from '../../repositories/userRepository.js';

export const getProfilePage = async (req, res) => {
  try {
    const user = await userRepository.findUserById(req.user._id);
    res.render('user/profile', {
      title: 'My Profile',
      user,
      error: null,
      success: null
    });
  } catch (err) {
    console.error('getProfilePage error:', err.message);
    res.status(500).send('Server error');
  }
};

export const updateProfile = async (req, res) => {
  try {
    await profileService.updateProfile(req.user._id, req.body);
    const user = await userRepository.findUserById(req.user._id);
    res.render('user/profile', {
      title: 'My Profile',
      user,
      error: null,
      success: 'Profile updated successfully'
    });
  } catch (err) {
    const user = await userRepository.findUserById(req.user._id);
    res.render('user/profile', {
      title: 'My Profile',
      user,
      error: err.message,
      success: null
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    await profileService.changePassword(req.user._id, req.body);
    const user = await userRepository.findUserById(req.user._id);
    res.render('user/profile', {
      title: 'My Profile',
      user,
      error: null,
      success: 'Password changed successfully'
    });
  } catch (err) {
    const user = await userRepository.findUserById(req.user._id);
    res.render('user/profile', {
      title: 'My Profile',
      user,
      error: err.message,
      success: null
    });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    if (!req.file) throw new Error('No image uploaded');
    await profileService.updateAvatar(req.user._id, req.file.secure_url); 
    const user = await userRepository.findUserById(req.user._id);
    res.render('user/profile', {
      title: 'My Profile',
      user,
      error: null,
      success: 'Profile photo updated successfully'
    });
  } catch (err) {
    const user = await userRepository.findUserById(req.user._id);
    res.render('user/profile', {
      title: 'My Profile',
      user,
      error: err.message,
      success: null
    });
  }
};