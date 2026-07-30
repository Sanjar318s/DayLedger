const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('../db');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const email = profile.emails[0].value;
    let user = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    if (user.rows.length === 0) {
      user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (user.rows.length > 0) {
        await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.rows[0].id]);
        return done(null, user.rows[0]);
      } else {
        const publicId = String(Math.floor(10000 + Math.random() * 90000));
        const newUser = await pool.query(
          'INSERT INTO users (email, google_id, public_id) VALUES ($1, $2, $3) RETURNING *',
          [email, googleId, publicId]
        );
        return done(null, newUser.rows[0]);
      }
    }
    return done(null, user.rows[0]);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  done(null, res.rows[0]);
});

module.exports = passport;
