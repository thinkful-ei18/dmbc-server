'use strict';
const LocalStrategy = require('passport-local').Strategy;
const { User } = require('../models/user');

const localStrategy = new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  (username, password, done) => {
    let user;
    User.findOne({ email: username })
      .then(results => {
        user = results;
        if (!user) {
          return done(null, false);
        }
        return user.validatePassword(password);
      })
      .then(isValid => {
        if (!isValid) {
          return done(null, false);
        }
        return done(null, user);
      })
      .catch(err => {
        done(err);
      });
  }
);

module.exports = localStrategy;
