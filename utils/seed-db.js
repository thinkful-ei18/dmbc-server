'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models/user');
const { Itinerary } = require('../models/itinerary');
const { Block } = require('../models/block');
const { Card } = require('../models/card');
const { Destination } = require('../models/destination');
const seedItineraries = require('../db/seed/itineraries');
const seedUsers = require('../db/seed/users');
const seedBlocks = require('../db/seed/blocks');
const seedCards = require('../db/seed/cards');
const seedDestinations = require('../db/seed/destinations');
const { DATABASE_URL } = require('../config');

mongoose
  .connect(DATABASE_URL)
  .then(() => mongoose.connection.db.dropDatabase())
  .then(() => User.insertMany(seedUsers))
  .then(() => Itinerary.insertMany(seedItineraries))
  .then(() => Block.insertMany(seedBlocks))
  .then(() => Card.insertMany(seedCards))
  .then(() => Destination.insertMany(seedDestinations))
  .then(() => User.ensureIndexes())
  .then(() => Itinerary.ensureIndexes())
  .then(() => Block.ensureIndexes())
  .then(() => Card.ensureIndexes())
  .then(() => Destination.ensureIndexes())
  .then(() => mongoose.disconnect())
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });
