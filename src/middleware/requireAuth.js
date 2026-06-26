'use strict';

/**
 * Express middleware — blocks unauthenticated requests.
 * If the user is not logged in, redirects to /login.
 */
module.exports = function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};
