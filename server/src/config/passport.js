const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../db');

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const displayName = profile.displayName;
    const avatarUrl = profile.photos?.[0]?.value;
    const googleId = profile.id;

    // Upsert user
    const result = await pool.query(
      `INSERT INTO users (email, display_name, avatar_url, google_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             avatar_url   = EXCLUDED.avatar_url
       RETURNING *`,
      [email, displayName, avatarUrl, googleId]
    );

    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
}));

module.exports = passport;