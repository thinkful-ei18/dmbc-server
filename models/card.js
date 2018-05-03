'use strict';
const mongoose = require('mongoose');

const cardSchema = mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  address: { type: String, required: true },
  hours: {type: String, require: true},
  ambassador: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  rating: {type: Number, required: true}
});

cardSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

const Card = mongoose.model('Card', cardSchema);

module.exports = { Card };