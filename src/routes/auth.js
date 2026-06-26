'use strict';

const { Router }       = require('express');
const passport         = require('passport');
const GoogleStrategy   = require('passport-google-oauth20').Strategy;
const router           = Router();

// ── Passport strategy ────────────────────────────────────────────────────────────────────────────
// Only register when env vars are present (not during unit tests)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    },
    (_accessToken, _refreshToken, profile, done) => {
      const user = {
        googleId: profile.id,
        email:    profile.emails?.[0]?.value  || '',
        name:     profile.displayName         || 'User',
        picture:  profile.photos?.[0]?.value  || null,
      };
      return done(null, user);
    }
  ));
}

// Serialize: what to store in the session (the whole user object — small enough)
passport.serializeUser((user, done) => done(null, user));

// Deserialize: reconstruct req.user from what was stored
passport.deserializeUser((user, done) => done(null, user));

// ── Routes ─────────────────────────────────────────────────────────────────────────────────

/** Step 1 — redirect browser to Google’s consent screen */
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
