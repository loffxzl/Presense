import * as emailChangeService from '../../services/emailChangeService.js';

export const getChangeEmailPage = (req, res) => {
  res.render('user/changeEmail', {
    title: 'Change Email',
    user: req.user,
    error: null,
    success: null
  });
};

export const postChangeEmail = async (req, res) => {
  try {
    await emailChangeService.initiateEmailChange(req.user._id, req.body.newEmail);
    req.session.pendingNewEmail = req.body.newEmail.toLowerCase().trim();
    res.redirect('/profile/verify-email-change');
  } catch (err) {
    res.render('user/changeEmail', {
      title: 'Change Email',
      user: req.user,
      error: err.message,
      success: null
    });
  }
};

export const getVerifyEmailChangePage = (req, res) => {
  if (!req.session.pendingNewEmail) return res.redirect('/profile/change-email');
  res.render('user/verifyEmailChange', {
    title: 'Verify New Email',
    user: req.user,
    error: null,
    message: null,
    email: req.session.pendingNewEmail
  });
};

export const postVerifyEmailChange = async (req, res) => {
  try {
    const newEmail = req.session.pendingNewEmail;
    if (!newEmail) return res.redirect('/profile/change-email');

    await emailChangeService.verifyEmailChange(req.user._id, newEmail, req.body.otp);
    req.session.pendingNewEmail = null;

    res.redirect('/profile?success=Email updated successfully');
  } catch (err) {
    res.render('user/verifyEmailChange', {
      title: 'Verify New Email',
      user: req.user,
      error: err.message,
      message: null,
      email: req.session.pendingNewEmail
    });
  }
};