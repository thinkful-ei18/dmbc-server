'use strict';

const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const { Itinerary } = require('../models/itinerary');
const { Destination } = require('../models/destination');
const passport = require('passport');

/**
 * Router uses JWT to protect all endpoints here.
 */
router.use(
  passport.authenticate('jwt', { session: false, failWithError: true })
);

router.get('/itinerary', (req, res, next) => {
  User.findById(req.user.id)
    .populate({
      path: 'itineraries',
      model: 'Itinerary',
      populate: [
        {
          path: 'blocks',
          model: 'Block'
          // populate: {
          //   path: 'cards',
          //   model: 'Card'
          // }
        },
        {
          path: 'destination',
          model: 'Destination'
        }
      ]
    })
    .populate('destination')
    .then(response => {
      res.json(response.itineraries);
    })
    .catch(err => {
      next(err);
    });
});

router.get('/itineraries', (req, res, next) => {
  Itinerary.find({ ambassador: req.user.id })
    .then(response => {
      res.json(response);
    })
    .catch(err => {
      next(err);
    });
});

router.get('/itineraries/:id', (req, res, next) => {
  Itinerary.find({ _id: req.params.id, ambassador: req.user.id })
    .populate({
      path: 'blocks',
      model: 'Block'
      // populate: {
      //   path: 'cards',
      //   model: 'Card'
      // }
    })
    .then(response => {
      res.json(response);
    })
    .catch(err => {
      next(err);
    });
});

router.post('/itinerary', (req, res, next) => {
  let {
    partners,
    ambassador,
    dateStart,
    dateEnd,
    destination,
    distance,
    tags
  } = req.body;

  let newDestination = {
    latitude: destination.latitude,
    longitude: destination.longitude,
    locationName: destination.label,
    tags,
    distance
  };

  let itinerary;

  if (!req.body.partners) {
    let err = new Error('Must include Partners');
    err.status = 400;
    return next(err);
  }
  
  Destination.create(newDestination)
    .then(response => {
      let newItinerary = {
        partners,
        ambassador,
        dateStart,
        dateEnd,
        destination: response.id
      };
      return Itinerary.create(newItinerary);
    })
    .then(response => {
      itinerary = response;
      return User.findByIdAndUpdate(req.user.id, { itineraries: response.id });
    })
    .then(() => {
      res.status(201).json(itinerary);
    })
    .then(ambassador => {
      let newItinerary = { partners, ambassador, dateStart, dateEnd, destination };
      Itinerary.create(newItinerary)
        .then(response => {
          res.status(201).json(response);
        })
        .catch(err => {
          next(err);
        });
    });
});

router.put('/itinerary/:id/cards', (req, res, next) => {
  let card = req.body.card;

  Itinerary.findById(req.params.id)
    .then(response => {
      let newCards = response.cards;
      newCards.push(card);
      return Itinerary.findByIdAndUpdate(
        req.params.id,
        {
          cards: newCards
        },
        { new: true }
      );
    })
    .then(response => {
      res.status(201).json(response);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
