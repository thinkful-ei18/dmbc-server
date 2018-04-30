'use strict';
const passport = require('passport');
const options = { session: false, failWithError: true };
const localAuth = passport.authenticate('local', options);
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { JWT_EXPIRY, JWT_SECRET } = require('../config');
const jwtStrategy = require('../passport/jwt');
passport.use(jwtStrategy);

/**
 *
 * @param {Object} user
 *
 * Creates and signs a new JWT with the user passed in.
 */
function createAuthToken(user) {
  return jwt.sign({ user }, JWT_SECRET, {
    subject: user.name,
    expiresIn: JWT_EXPIRY
  });
}

/**
 * Login uses local auth to do a verification that the hash matches
 * the hash passed in to from the log in
 */
router.post('/login', localAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  return res.json({ authToken });
});

const jwtAuth = passport.authenticate('jwt', options);
// Hits refresh every time it logs in to try and get a new JWT
router.post('/refresh', jwtAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  return res.json({ authToken });
});

module.exports = router;
