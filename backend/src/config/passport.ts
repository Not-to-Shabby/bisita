import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from '../models/User.js';

const configurePassport = (): void => {
  // Serialize user ID to session
  passport.serializeUser((user: any, done) => {
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: '/api/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists with this Google ID
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
              return done(null, user);
            }

            // Check if user exists with same email
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await User.findOne({ email });
              if (user) {
                // Link Google account to existing user
                user.googleId = profile.id;
                if (!user.avatar && profile.photos?.[0]?.value) {
                  user.avatar = profile.photos[0].value;
                }
                await user.save();
                return done(null, user);
              }
            }

            // Create new user
            user = await User.create({
              googleId: profile.id,
              email: email,
              username: profile.displayName || `user_${profile.id.slice(0, 8)}`,
              avatar: profile.photos?.[0]?.value,
              isEmailVerified: true, // Google emails are pre-verified
              role: 'tourist',
            });

            done(null, user);
          } catch (error) {
            done(error as Error, undefined);
          }
        }
      )
    );
    console.log('✅ Google OAuth configured');
  } else {
    console.warn('⚠️ Google OAuth not configured (missing credentials)');
  }

  // Facebook OAuth Strategy
  const facebookAppId = process.env.FACEBOOK_APP_ID;
  const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;

  if (facebookAppId && facebookAppSecret) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: facebookAppId,
          clientSecret: facebookAppSecret,
          callbackURL: '/api/auth/facebook/callback',
          profileFields: ['id', 'displayName', 'email', 'photos'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists with this Facebook ID
            let user = await User.findOne({ facebookId: profile.id });

            if (user) {
              return done(null, user);
            }

            // Check if user exists with same email
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await User.findOne({ email });
              if (user) {
                // Link Facebook account to existing user
                user.facebookId = profile.id;
                if (!user.avatar && profile.photos?.[0]?.value) {
                  user.avatar = profile.photos[0].value;
                }
                await user.save();
                return done(null, user);
              }
            }

            // Create new user
            user = await User.create({
              facebookId: profile.id,
              email: email,
              username: profile.displayName || `user_${profile.id.slice(0, 8)}`,
              avatar: profile.photos?.[0]?.value,
              isEmailVerified: !!email, // Facebook may not always provide email
              role: 'tourist',
            });

            done(null, user);
          } catch (error) {
            done(error as Error, undefined);
          }
        }
      )
    );
    console.log('✅ Facebook OAuth configured');
  } else {
    console.warn('⚠️ Facebook OAuth not configured (missing credentials)');
  }
};

export default configurePassport;
