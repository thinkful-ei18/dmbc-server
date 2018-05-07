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
    return Promise.reject();
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
  const searchTerm = req.query.searchTerm;

  let filter = {};
  let projection = {};

  if (searchTerm) {
    filter.$text = {
      $search: searchTerm
    };
    projection.score = {
      $meta: 'textScore'
    };
  }

  Card.find(filter, projection)
    .sort(projection)
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
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ CARDs BELONGING TO A USER ========== */
router.get('/cards/:ambassador', (req, res, next) => {
  const {ambassador} = req.params;

  if (!mongoose.Types.ObjectId.isValid(ambassador)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Card.find({ambassador})
    .then(result => {
      if (result.length > 0) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/cards', (req, res, next) => {
  const ambassador = req.user.id;
  const { name, description, address, hours, latitude, longitude, image } = req.body;

  const requiredFields = ['name', 'description', 'address', 'hours'];
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

  const trimmedField = stringFields.every(field => {
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
    latitude, 
    longitude,
    image
  };

  validateAmbassador(ambassador)
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
router.put('/cards/:id', (req, res, next) => {
  const { id } = req.params;
  const { name, description, address, hours, ambassador, rating, tips, image } = req.body;

  /***** Never trust users - validate input *****/
  if (!name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (req.body.id !== req.params.id) {
    const err = new Error('Id\'s do not match');
    err.status = 400;
    return next(err);
  }

  const updateItem = { 
    name, 
    description, 
    address, 
    hours, 
    ambassador, 
    rating, 
    tips,
    image
  };

  const options = { new: true };

  validateAmbassador(ambassador)
    .then(() => Card.findByIdAndUpdate(id, updateItem, options))
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE Rating ========== */
router.put('/cards/:id/rate', (req, res, next) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (!rating) {
    const err = new Error('Rating is empty');
    err.status = 400;
    return next(err);
  }

  /***** Never trust users - validate input *****/

  Card.findById(id)
    .then(result => {
      if (result) {
        result.ratingScore += rating;
        result.ratingCount ++;
        return result.save();
      } else {
        next();
      }
    })
    .then(response => {
      res.json(response);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE Tips ========== */
router.put('/cards/:id/tips', (req, res, next) => {
  const { id } = req.params;
  const { tips } = req.body;

  if (!tips) {
    const err = new Error('Tips is empty');
    err.status = 400;
    return next(err);
  }

  /***** Never trust users - validate input *****/
  const options = { new: true };

  Card.findById({_id: id})
    .then(result => {
      if (result) {
        result.tips.push(tips);
        return Card.findByIdAndUpdate(id, {tips: result.tips}, options);
      } else {
        next();
      }
    })
    .then(response => {
      res.json(response);
    })
    .catch(err => {
      next(err);
    });
});

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