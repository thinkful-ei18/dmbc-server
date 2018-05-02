'use strict';
const mongoose = require('mongoose');

const blockSchema = mongoose.Schema({
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
  selectedCard: { type: mongoose.Schema.Types.ObjectId, ref: 'Card'},
  date: { type: Date, required: true },
  title: { type: String, required: true }
});

blockSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});

const Block = mongoose.model('Block', blockSchema);

module.exports = { Block };
