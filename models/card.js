'use strict';
const mongoose = require('mongoose');

const cardSchema = mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: { type: String, required: true, index: true },
  address: { type: String, required: true },
  location: {
    type: {type: String},
    coordinates: []
  },
  phone: {type: String, require: true},
  ambassador: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  ratingScore: {type: Number, default: 0},
  ratingCount: {type: Number, default: 0},
  tips: [{type: String, index: true}],
  tags: [{type: String, index: true}],
  image: {type: String, default: 'something'}
});

cardSchema.index({name: 'text', description: 'text', tips: 'text'}, { weights: { name: 10, tags: 7,  description: 5, tips: 1 } });
cardSchema.index({location: '2dsphere'});

cardSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

const Card = mongoose.model('Card', cardSchema);

module.exports = { Card };