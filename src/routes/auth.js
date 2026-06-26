'use strict';

const { Router }     = require('express');
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getPool }    = require('../db');
const router         = Router();

// ── Passport strategy ─────────────────────────────────────────────────────────────────────
// Only registered when env vars are present — skipped during unit tests.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      // Build the user object from the Google profile
      const user = {
        googleId: profile.id,
        email:    profile.emails?.[0]?.value || '',
        name:     profile.displayName        || 'User',
        picture:  profile.photos?.[0]?.value || null,
      };

      // ── Upsert into useraccounts ──────────────────────────────────────────────────────
      // LAST_INSERT_ID(id) in the ON DUPLICATE KEY clause makes result.insertId
      // return the existing row's id on updates — no follow-up SELECT needed.
      const pool = getPool();
      if (pool) {
        try {
          const [result] = await pool.execute(`
            INSERT INTO useraccounts
              (google_id, email, name, picture_url, first_login_at, last_login_at, login_count)
            VALUES (?, ?, ?, ?, NOW(), NOW(), 1)
            ON DUPLICATE KEY UPDATE
              id            = LAST_INSERT_ID(id),
              email         = VALUES(email),
              name          = VALUES(name),
              picture_url   = VALUES(picture_url),
              last_login_at = NOW(),
              login_count   = login_count + 1
          `, [user.googleId, user.email, user.name, user.picture]);

          // Attach the local surrogate PK to the session user object
          user.localId = result.insertId;

          console.log(`✅  useraccounts upsert — localId=${user.localId} email=${user.email}`);
        } catch (err) {
          // Non-fatal: log the error but still allow login
          console.error('useraccounts upsert error:', err.message);
        }
      }

      return done(null, user);
    }
  ));
}

// Serialize: store the whole user object in the session
passport.serializeUser((user, done) => done(null, user));

// Deserialize: reconstruct req.user from the session store
passport.deserializeUser((user, done) => done(null, user));

// ── Routes ───────────────────────────────────────────────────────────────────────────────

/** Step 1 — redirect browser to Google's consent screen */
router.get('/google',
  passport.authenticate('google', { scope: ['openid', 'profile', 'email'] })
);

/** Step 2 — Google redirects back here after the user consents */
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
  (req, res) => res.redirect('/dashboard')
);

/** Logout — destroy server-side session and clear cookie */
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('hellonode.sid');
      res.redirect('/login');
    });
  });
});

module.exports = router;
