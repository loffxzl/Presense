import bcrypt from 'bcrypt';
import User from '../../models/User.js';

export const getLoginPage = (req, res) => {
  if (req.session.admin) return res.redirect('/admin/users');
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Login', error: null });
};

export const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('auth/login', { title: 'Login', error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.render('auth/login', { title: 'Login', error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.render('auth/login', { title: 'Login', error: 'Invalid credentials' });
    }

    if (user.status === 'blocked') {
      return res.render('auth/login', { title: 'Login', error: 'Your account has been blocked' });
    }

    if (user.role === 'admin') {
      req.session.admin = { id: user._id, email: user.email, name: user.name };
      return res.redirect('/admin/users');
    } else {
      req.session.user = { id: user._id, email: user.email, name: user.name };
      return res.redirect('/');
    }

  } catch (err) {
    console.error('postLogin error:', err.message);
    return res.render('auth/login', { title: 'Login', error: 'Something went wrong. Try again.' });
  }
};

export const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err.message);
    res.redirect('/auth/login');
  });
};