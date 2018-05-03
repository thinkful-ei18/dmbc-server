'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

const { Card } = require('../models/card');
const { User } = require('../models/user');

router.use(
  passport.authenticate('jwt', { session: false, failWithError: true })
);

function validateAmbassador(userId) {
  if (!userId) {
    return Promise.resolve();
  }
  return User.findOne({ _id: userId })
    .then(result => {
      if (!result) {
        return Promise.reject('InvalidUser');
      } else if (!result.ambassador) {
        return Promise.reject('NotAmbassador');
      }
    });
}

/* ========== GET/READ ALL ITEM ========== */
router.get('/cards', (req, res, next) => {
  Card.find()
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/cards/:id', (req, res, next) => {
  const {id} = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Card.findOne({_id: id})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(next);
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/cards', (req, res, next) => {
  const { name, description, address, hours, ambassador, rating } = req.body;

  const valAmbassadorProm = validateAmbassador(ambassador);

  const requiredFields = ['name', 'description', 'address', 'hours', 'ambassador', 'rating'];
  const hasFields = requiredFields.every(field => {
    return req.body[field];
  });

  const stringFields = ['name', 'description', 'address', 'hours'];
  const stringField = stringFields.every(field => {
    return field in req.body && typeof req.body[field] === 'string';
  });

  if (!hasFields) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Missing field',
      location: 'hasFields'
    });
  }

  if (!stringField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Incorrect field type: expected string',
      location: 'stringField'
    });
  }

  const trimmedField = requiredFields.every(field => {
    return req.body[field].trim() === req.body[field];
  });

  if (!trimmedField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Field cannot start or end with whitespace',
      location: 'trimmedField'
    });
  }

  const newCard = {
    name, 
    description, 
    address, 
    hours, 
    ambassador, 
    rating 
  };

  Promise.all([valAmbassadorProm])
    .then(() => Card.create(newCard))
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err === 'InvalidUser') {
        err = new Error('The ambassador is not valid user');
        err.status = 400;
      }
      if (err === 'NotAmbassador') {
        err = new Error('The user is not an ambassador');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
// Not sure what to do yet

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/cards/:id', (req, res, next) => {
  const {id} = req.params;

  Card.findOneAndRemove({_id: id})
    .then(count => {
      if (count) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch(next);
});

module.exports = router;