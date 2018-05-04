'use strict';
const mongoose = require('mongoose');

const cardSchema = mongoose.Schema({
  name: { type: String, required: true, index: true },
  description: { type: String, required: true, index: true },
  address: { type: String, required: true },
  latitude: { type: String, required: true },
  longitude: { type: String, required: true },
  hours: {type: String, require: true},
  ambassador: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  rating: [{type: Number, default: 0}],
  tips: [{type: String, index: true}],
  tags: [{type: String, index: true}]
});

cardSchema.index({name: 'text', description: 'text', tips: 'text'}, { weights: { name: 10, tags: 7,  description: 5, tips: 1 } });

cardSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

const Card = mongoose.model('Card', cardSchema);

module.exports = { Card };