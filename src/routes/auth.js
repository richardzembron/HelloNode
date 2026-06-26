'use strict';

const { Router }     = require('express');
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getPool }    = require('../db');
const router         = Router();

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      const user = {
        googleId: profile.id,
        email:    profile.emails?.[0]?.value || '',
        name:     profile.displayName        || 'User',
        picture:  profile.photos?.[0]?.value || null,
      };

      const pool = getPool();
      if (pool) {
        try {
          // Check if this is a new or existing user
          const [[existing]] = await pool.execute(
            'SELECT id FROM useraccounts WHERE google_id = ?', [user.googleId]
          );

          if (!existing) {
            // New user — check maxuseraccounts limit before inserting
            const [[envRow]] = await pool.execute(
              'SELECT content FROM environment WHERE name = ?', ['maxuseraccounts']
            );
            const maxAccounts = envRow ? parseInt(envRow.content, 10) : Infinity;

            const [[{ count }]] = await pool.execute(
              'SELECT COUNT(*) AS count FROM useraccounts'
            );

            if (Number(count) >= maxAccounts) {
              user.blocked = true;
              console.warn(`useraccounts limit reached: count=${count} max=${maxAccounts} — blocked ${user.email}`);
              return done(null, user);
            }
          }

          // Upsert (insert new or update returning user)
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

          user.localId = result.insertId;
          console.log(`✅  useraccounts upsert — localId=${user.localId} email=${user.email}`);

        } catch (err) {
          console.error('useraccounts upsert error:', err.message);
        }
      }

      return done(null, user);
    }
  ));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

router.get('/google',
  passport.authenticate('google', { scope: ['openid', 'profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
  (req, res) => {
    if (req.user && req.user.blocked) {
      const msg = encodeURIComponent(
        'Sorry, can not add you as a user, as the useraccount table has reached its maximum number of user accounts'
      );
      return res.redirect(`/problem?msg=${msg}`);
    }
    res.redirect('/dashboard');
  }
);

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
