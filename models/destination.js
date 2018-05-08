'use strict';
const mongoose = require('mongoose');

const destinationSchema = mongoose.Schema({
  locationName: { type: String, required: true },
  tags: [{ type: String }],
  location: {
    type: { type: String },
    coordinates: []
  },
  distance: { type: Number, required: true } // calculate business logic with this https://www.movable-type.co.uk/scripts/latlong.html
});

destinationSchema.index({ location: '2dsphere' });

destinationSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

const Destination = mongoose.model('Destination', destinationSchema);

module.exports = { Destination };
