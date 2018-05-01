'use strict';
const mongoose = require('mongoose');

const itinerarySchema = mongoose.Schema({
  partners: { type: String, required: true },
  ambassador: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
  dateStart: { type: Date },
  dateEnd: { type: Date },
  destination: { type: mongoose.Schema.Types.ObjectId, ref: 'Destination' }
});

itinerarySchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

const Itinerary = mongoose.model('Itinerary', itinerarySchema);

module.exports = { Itinerary };
