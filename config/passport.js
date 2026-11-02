// config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as userRepository from '../repositories/userRepository.js';
import * as referralService from '../services/referralService.js';

export const initPassport = () => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;

      let user = await userRepository.findUserByEmail(email);

      if (user) {
        if (user.status === 'blocked') {
          return done(null, false, { message: 'Your account has been blocked' });
        }
        return done(null, user);
      }

      user = await userRepository.createUser({
        name: profile.displayName,
        email,
        passwordHash: 'google-oauth',
        role: 'user',
        status: 'active',
        isEmailVerified: true,
        avatarUrl: profile.photos[0]?.value,
        referralCode: await referralService.generateUniqueCode()
      });


      try {
        const state = String(req.query?.state || '');
        if (state.startsWith('ref:')) {
          const referrer = await referralService.resolveReferrer(state.slice(4));
          await referralService.attachReferral(user, referrer);
        }
      } catch (refErr) {
        console.error('Google referral attach failed:', refErr.message);
      }

      return done(null, user);

    } catch (err) {
      return done(err, null);
    }
  }));
};

export default passport;