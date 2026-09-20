const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./database');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE google_id = $1 OR email = $2',
          [profile.id, profile.emails[0].value]
        );

        if (existingUser.rows.length > 0) {
          // User exists, return user
          return done(null, existingUser.rows[0]);
        }

        // Create new user (Google users don't have a password initially)
        let normalizedUsername = profile.emails[0].value.split('@')[0].toLowerCase().replace(/\s+/g, '');
        const letterCount = (normalizedUsername.match(/[a-z]/g) || []).length;
        if (letterCount < 4) {
          normalizedUsername = `user_${normalizedUsername}`;
        }

        const result = await pool.query(
          'INSERT INTO users (username, email, password_hash, google_id, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, avatar, role, created_at',
          [normalizedUsername, profile.emails[0].value, null, profile.id, profile.photos[0]?.value || null]
        );

        return done(null, result.rows[0]);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, avatar, role, created_at FROM users WHERE id = $1',
      [id]
    );
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
