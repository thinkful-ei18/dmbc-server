'use strict';

const express = require('express');
const router = express.Router();
const { User } = require('../models/user');

router.get('/users', (req, res, next) => {
  User.find()
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

router.post('/users', (req, res, next) => {
  /**
   * A lot of validators for the user API endpoint.
   */
  const { name, email, password, ambassador } = req.body;
  const lengthValidation = {
    name: {
      min: 1
    },
    password: {
      min: 8,
      max: 72
    },
    email: {
      min: 5,
      max: 72
    }
  };

  const requiredFields = ['name', 'email', 'password'];

  const errorGenerator = function(message) {
    const err = new Error(message);
    err.status = 422;
    return err;
  };

  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {
    const err = errorGenerator(`Missing ${missingField} in request body`);
    return next(err);
  }

  const nonStringField = requiredFields.find(
    field => typeof req.body[field] !== 'string'
  );

  if (nonStringField) {
    const err = errorGenerator(`${nonStringField} must be a string`);
    return next(err);
  }

  const whiteSpace = requiredFields.find(
    field =>
      req.body[field][0] === ' ' ||
      req.body[field][req.body[field].length - 1] === ' '
  );

  if (whiteSpace) {
    const err = errorGenerator(
      `${whiteSpace} must not have any leading or trailing whitespace`
    );
    return next(err);
  }

  const tooShort = requiredFields.find(
    field => req.body[field].length < lengthValidation[field].min
  );
  const tooLong = requiredFields.find(
    field => req.body[field].length > lengthValidation[field].max
  );

  if (tooShort || tooLong) {
    const err = errorGenerator(
      tooShort
        ? `${tooShort} must be ${
            lengthValidation[tooShort].min
          } characters or longer`
        : `${tooLong} must be ${
            lengthValidation[tooLong].max
          } characters or smaller`
    );
    return next(err);
  }
  /**
   * Hash password and then create the user with hashed password.
   * Handles async errors from database validation as well.
   */
  return User.hashPassword(password)
    .then(digest => {
      const newUser = { name, email, password: digest, ambassador };
      return User.create(newUser);
    })
    .then(response => {
      if (response) {
        res
          .status(201)
          .location(`${req.originalUrl}/${response.id}`)
          .json(response);
      } else {
        next();
      }
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('That email already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;
