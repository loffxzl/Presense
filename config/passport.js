import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as userRepository from '../repositories/userRepository.js';

export const initPassport = () => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
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
        avatarUrl: profile.photos[0]?.value
      });

      return done(null, user);

    } catch (err) {
      return done(err, null);
    }
  }));
};

export default passport;