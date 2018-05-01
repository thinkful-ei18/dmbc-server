'use strict';

const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const { Itinerary } = require('../models/itinerary');
const passport = require('passport');

/**
 * Router uses JWT to protect all endpoints here.
 */
router.use(
  passport.authenticate('jwt', { session: false, failWithError: true })
);

router.get('/itinerary', (req, res, next) => {
  User.findById(req.user.id)
    .populate('itineraries')
    .then(response => {
      res.json(response.itineraries);
    })
    .catch(err => {
      next(err);
    });
});

router.post('/itinerary', (req, res, next) => {
  let { partners, ambassador, dateStart, dateEnd, destination } = req.body;
  let newItinerary = { partners, ambassador, dateStart, dateEnd, destination };

  if (!newItinerary.partners) {
    let err = new Error('Must include Partners');
    err.status = 400;
    return next(err);
  }
  Itinerary.create(newItinerary)
    .then(response => {
      res.status(201).json(response);
    })
    .catch(err => {
      next(err);
    });
});


module.exports = router;