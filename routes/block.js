'use strict';

const express = require('express');
const router = express.Router();
const { User } = require('../models/user');
const { Block } = require('../models/block');
const { Itinerary } = require('../models/itinerary');
const passport = require('passport');

router.use(
  passport.authenticate('jwt', { session: false, failWithError: true })
);

router.get('/blocks', (req, res, next) => {
  User.findById(req.user.id)
    .populate({
      path: 'itineraries',
      model: 'Itinerary',
      populate: {
        path: 'blocks',
        model: 'Block'
        // populate: {
        //   path: 'cards',
        //   model: 'Card'
        // }
      }
    })
    .then(response => {
      res.json(response.itineraries.blocks);
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
  let block;
  Block.create(newBlock)
    .then(response => {
      block = response; 
      return User.findById(req.user.id);
    })
    .then(response => {
      return Itinerary.findById(response.itineraries);
    })
    .then(response => {
      response.blocks.push(block.id);
      return Itinerary.findByIdAndUpdate(response.id, {blocks: response.blocks});
    })
    .then(() => {
      res.status(201).json(block);
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
      let result = false;
      for (let i = 0; i < newCards.length; i ++) {
        if (newCards[i].toString() === card) {
          result = true;
        }
      }
      if (!result) {
        newCards.push(card);
        return Block.findByIdAndUpdate(
          req.params.id,
          {
            cards: newCards
          },
          { new: true }
        );
      }
      return newCards;
    })
    .then(response => {
      return Block.findById(req.params.id)
        .populate('cards');
    })
    .then(response => {
      res.status(201).json(response);
    })
    .catch(err => {
      next(err);
    });
});

router.put('/block/:id/select', (req, res, next) => {
  let { selection } = req.body;
  Block.findByIdAndUpdate(
    req.params.id,
    { selectedCard: selection },
    { new: true }
  )
    .then(() => {
      return Block.findById(req.params.id).populate('cards');
    })
    .then(response => {
      res.status(201).json(response);
    })
    .catch(err => {
      next(err);
    });
});

router.put('/block/:id/deselect', (req, res, next) => {
  Block.findByIdAndUpdate(req.params.id, { selectedCard: null}, { new: true })
    .then(() => {
      return Block.findById(req.params.id).populate('cards');
    })
    .then(response => {
      res.status(201).json(response);
    })
    .catch(err => {
      next(err);
    });
});

router.put('/block/:id/removecard', (req, res, next) => {
  const {id} = req.params;
  const {cardID, cards} = req.body;
  // console.log(cardID, cards);
  const newCards = cards.filter(card => card !== cardID);

  Block
    .findByIdAndUpdate(
      {_id: id},
      {cards: newCards},
      {new: true}
    )
    .then(() => {
      return Block.findById(req.params.id).populate('cards');
    })
    .then(response => {
      res.status(201).json(response);
    })
    .catch(err => {
      next(err);
    });
});

router.delete('/block/:id', (req, res, next) => {
  const {id} = req.params;
  
  Block
    .findOneAndRemove({_id: id})
    .then(count => {
      if (count) {
        res
          .status(204)
          .end();
      } else {
        next();
      }
    })
    .catch(next);
});

module.exports = router;
