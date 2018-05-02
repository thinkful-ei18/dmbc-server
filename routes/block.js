'use strict';

const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const { Block } = require('../models/block');
const passport = require('passport');

router.use(
  passport.authenticate('jwt', { session: false, failWithError: true })
);

router.get('/blocks', (req, res, next) => {
  User.findById(req.user.id)
    .populate({path:'itineraries', model: 'Itinerary', populate: {
      path: 'blocks',
      model: 'Block'
    }})
    .then(response => {
      res.json(response.itineraries[0].blocks);
    })
    .catch(err => {
      next(err);
    });
});

router.post('/block', (req, res, next) => {
  let { date, title } = req.body;
  let newBlock = { date, title };

  if (!newBlock.title) {
    let err = new Error('Must include a title');
    err.status = 400;
    return next(err);
  }
  Block.create(newBlock)
    .then(response => {
      res.status(201).json(response);
    })
    .catch(err => {
      next(err);
    });
});

router.put('/block/:id/cards', (req, res, next) => {
  let card = req.body.card;

  Block.findById(req.params.id)
    .then(response => {
      let newCards = response.cards;
      newCards.push(card);
      return Block.findByIdAndUpdate(req.params.id, {
        cards: newCards
      }, { new: true });
    })
    .then(response => {
      res.status(201).json(response);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
