import { verifyAccessToken, verifyRefreshToken, generateAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

// Admin middleware uses session
export const isAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.admin) return next();
  res.redirect('/auth/login');
};

// User middleware - uses JWT
export const isUserAuthenticated = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
      return res.redirect('/auth/login');
    }

    if (accessToken) {
      try {
        const decoded = verifyAccessToken(accessToken);
        const user = await User.findById(decoded.id).select('-passwordHash');
        if (!user || user.status === 'blocked') return res.redirect('/auth/login');
        req.user = user;
        return next();
      } catch (err) {
        // Access token expired — try refresh token
      }
    }

    if (refreshToken) {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findOne({ _id: decoded.id, refreshToken });
      if (!user || user.status === 'blocked') return res.redirect('/auth/login');

      // Issue new access token
      const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000 // 15 mins
      });

      req.user = user;
      return next();
    }

    res.redirect('/auth/login');
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.redirect('/auth/login');
  }
};

// Attach user to res.locals if logged in (for navbar etc)
export const attachUser = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (accessToken) {
      const decoded = verifyAccessToken(accessToken);
      const user = await User.findById(decoded.id).select('name email role avatarUrl');
      res.locals.user = user;
    } else {
      res.locals.user = null;
    }
  } catch {
    res.locals.user = null;
  }
  next();
};