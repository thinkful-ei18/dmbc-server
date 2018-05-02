'use strict';
const app = require('../index');
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSpies = require('chai-spies');
const express = require('express');
const expect = chai.expect;
const jwt = require('jsonwebtoken');

chai.use(chaiHttp);
chai.use(chaiSpies);

const mongoose = require('mongoose');
const { TEST_DATABASE_URL, JWT_SECRET } = require('../config');
const { User } = require('../models/user');
const { Itinerary } = require('../models/itinerary');
const { Block } = require('../models/block');
const seedItineraries = require('../db/seed/itineraries');
const seedUsers = require('../db/seed/users');
const seedBlocks = require('../db/seed/blocks');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
describe('Before and After Hooks', function() {
  let token;
  before(function() {
    return mongoose.connect(TEST_DATABASE_URL, { autoIndex: false });
  });

  beforeEach(function() {
    mongoose.connection.db.dropDatabase();
    return User.insertMany(seedUsers)
      .then(() => User.ensureIndexes())
      .then(() => Itinerary.insertMany(seedItineraries))
      .then(() => Itinerary.ensureIndexes())
      .then(() => Block.insertMany(seedBlocks))
      .then(() => Block.ensureIndexes())
      .then(() => User.findById('322222222222222222222200'))
      .then(response => {
        token = jwt.sign(
          {
            user: {
              email: response.email,
              id: response.id
            }
          },
          JWT_SECRET,
          {
            algorithm: 'HS256',
            subject: response.email,
            expiresIn: '7d'
          }
        );
      });
  });

  afterEach(function() {
    sandbox.restore();
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('Authorized access', function() {
    it('should respond with unauthorized with no token', function() {
      return chai
        .request(app)
        .get('/api/itinerary')
        .then(() => expect.fail(null, null, 'Request should not succeed'))
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(401);
        });
    });
  });

  it('Should reject requests with an invalid token', function() {
    return User.findById('322222222222222222222200')
      .then(response => {
        return jwt.sign(
          {
            user: {
              email: response.email,
              id: response.id
            }
          },
          'wrong',
          {
            algorithm: 'HS256',
            subject: response.email,
            expiresIn: '7d'
          }
        );
      })
      .then(token => {
        return chai
          .request(app)
          .get('/api/itinerary')
          .set('Authorization', `Bearer ${token}`);
      })
      .then(() => expect.fail(null, null, 'Request should not succeed'))
      .catch(err => {
        if (err instanceof chai.AssertionError) {
          throw err;
        }
        const res = err.response;
        expect(res).to.have.status(401);
      });
  });

  describe('GET /itinerary', function() {
    it('should get a users populated itinerary', function() {
      return chai
        .request(app)
        .get('/api/itinerary')
        .set('authorization', `Bearer ${token}`)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body.blocks.length).to.equal(1);
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .get('/api/itinerary')
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('GET /itineraries', function() {
    it('should get itineraries for the ambassador', function() {
      return chai
        .request(app)
        .get('/api/itineraries')
        .set('authorization', `Bearer ${token}`)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body).to.not.eql(null);
        });
    });

    it('should return the correct values', function() {
      let item;
      return chai
        .request(app)
        .get('/api/itineraries')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          item = _response.body;
          return Itinerary.findById(item[0].id);
        })
        .then(response => {
          expect(item[0].id).to.equal(response.id);
          expect(item[0].partners).to.equal(response.partners);
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .get('/api/itineraries')
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('GET /itineraries/:id', function() {
    it('should get a populated itinerary for the ambassador', function() {
      return chai
        .request(app)
        .get('/api/itineraries/422222222222222222222200')
        .set('authorization', `Bearer ${token}`)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body).to.not.eql(null);
        });
    });

    it('should return the correct values', function() {
      let item;
      return chai
        .request(app)
        .get('/api/itineraries/422222222222222222222200')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          item = _response.body;
          return Itinerary.findById(item[0].id);
        })
        .then(response => {
          expect(item[0].id).to.equal(response.id);
          expect(item[0].partners).to.equal(response.partners);
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .get('/api/itineraries/422222222222222222222200')
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('POST /itinerary', function() {
    it('should post a new card with proper attributes', function() {
      let newItinerary = { partners: '2 kids', ambassador: '322222222222222222222200' };

      return chai
        .request(app)
        .post('/api/itinerary')
        .set('authorization', `Bearer ${token}`)
        .send(newItinerary)
        .then(response => {
          expect(response).to.have.status(201);
          expect(response.body).to.be.an('object');
          expect(response.body.partners).to.equal(newItinerary.partners);
          return Itinerary.count();
        })
        .then(response => {
          expect(response).to.equal(2);
        });
    });

    it('should 400 error when not all fields are present', function() {
      let newItem = { ambassador: '322222222222222222222200' };
      let spy = chai.spy();
      return chai
        .request(app)
        .post('/api/itinerary')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Must include Partners');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      let newItinerary = { partners: '2 kids', ambassador: '322222222222222222222200' };
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .post('/api/itinerary')
        .set('authorization', `Bearer ${token}`)
        .send(newItinerary)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('PUT /itinerary', function() {
    it('should update an itinerary with card information', function() {
      let newItinerary = { card: '522222222222222222222200' };

      return chai
        .request(app)
        .put('/api/itinerary/422222222222222222222200/cards')
        .set('authorization', `Bearer ${token}`)
        .send(newItinerary)
        .then(response => {
          expect(response).to.have.status(201);
          expect(response.body).to.be.an('object');
          return Itinerary.findById('422222222222222222222200');
        })
        .then(response => {
          expect(response.cards.length).to.equal(1);
        });
    });
  });

  it('should catch errors and respond properly', function() {
    const spy = chai.spy();
    let newItinerary = { card: '522222222222222222222200' };
    sandbox.stub(express.response, 'json').throws('TypeError');
    return chai
      .request(app)
      .put('/api/itinerary/422222222222222222222200/cards')
      .set('authorization', `Bearer ${token}`)
      .send(newItinerary)
      .then(spy)
      .catch(err => {
        expect(err).to.have.status(500);
      })
      .then(() => {
        expect(spy).to.not.have.been.called();
      });
  });
});
