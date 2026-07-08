import { verifyAccessToken, verifyRefreshToken, generateAccessToken } from '../utils/jwt.js';
import User from '../models/User.js';

// Admin middleware  session based
export const isAdminAuthenticated = (req, res, next) => {
  if (req.session && req.session.admin) return next();
  res.redirect('/auth/login');
};

// User middleware JWT with refresh token rotation
export const isUserAuthenticated = async (req, res, next) => {
  try {
    const accessToken  = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
      return res.redirect('/auth/login');
    }

    if (accessToken) {
      try {
        const decoded = verifyAccessToken(accessToken);
        const user = await User.findById(decoded.id).select('-passwordHash');

        if (!user) {
          clearAuthCookies(res);
          return res.redirect('/auth/login');
        }


        if (user.status === 'blocked') {
          clearAuthCookies(res);
          return res.redirect('/auth/login?blocked=true');
        }

        req.user = user;
        return next();
      } catch (err) {
        // Access token expired fall through to refresh token
      }
    }

    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await User.findOne({ _id: decoded.id, refreshToken }).select('-passwordHash');

        if (!user) {
          clearAuthCookies(res);
          return res.redirect('/auth/login');
        }


        if (user.status === 'blocked') {
          clearAuthCookies(res);
          return res.redirect('/auth/login?blocked=true');
        }

        const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000
        });

        req.user = user;
        return next();
      } catch (err) {
        clearAuthCookies(res);
        return res.redirect('/auth/login');
      }
    }

    res.redirect('/auth/login');

  } catch (err) {
    console.error('Auth middleware error:', err.message);
    clearAuthCookies(res);
    res.redirect('/auth/login');
  }
};

// Attach user to res.locals for navbar/views
export const attachUser = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (accessToken) {
      const decoded = verifyAccessToken(accessToken);
      const user = await User.findById(decoded.id).select('name email role avatarUrl status');

 
      res.locals.user = (user && user.status !== 'blocked') ? user : null;
    } else {
      res.locals.user = null;
    }
  } catch {
    res.locals.user = null;
  }
  next();
};


const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};