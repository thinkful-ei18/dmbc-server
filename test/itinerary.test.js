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
const seedItineraries = require('../db/seed/itineraries');
const seedUsers = require('../db/seed/users');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
describe('Before and After Hooks', function() {
  let token;
  before(function() {
    return mongoose.connect(TEST_DATABASE_URL, { autoIndex: false });
  });

  beforeEach(function() {
    return User.insertMany(seedUsers)
      .then(() => User.ensureIndexes())
      .then(() => Itinerary.insertMany(seedItineraries))
      .then(() => Itinerary.ensureIndexes())
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

  describe('GET /cards', function() {
    it('should get itineraries for the user', function() {
      return chai
        .request(app)
        .get('/api/itinerary')
        .set('authorization', `Bearer ${token}`)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body[0]).to.not.eql(null);
        });
    });

    it('should return the correct values', function() {
      let item;
      return chai
        .request(app)
        .get('/api/itinerary')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          item = _response.body[0];
          return Itinerary.findById(item.id);
        })
        .then(response => {
          expect(item.id).to.equal(response.id);
          expect(item.partners).to.equal(response.partners);
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

  describe('POST /itinerary', function() {
    it.only('should post a new card with proper attributes', function() {
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
      let newItem = { content: 'I am a cat' };
      let spy = chai.spy();
      return chai
        .request(app)
        .post('/api/cards')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Must include name');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      let newItem = { name: 'CATS' };
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .post('/api/cards')
        .set('authorization', `Bearer ${token}`)
        .send(newItem)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('GET /itinerary', function() {
    

    it('should return a 422 error when a field is missing', function() {
      let spy = chai.spy();
      let newUser = { name: 'tim', email: 'timmy@turner.com' };
      return chai
        .request(app)
        .post('/api/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal(
            'Missing password in request body'
          );
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a field is not a string', function() {
      let spy = chai.spy();
      let newUser = {
        name: 'tim',
        password: 1234456789,
        email: 'timmy@turner.com'
      };
      return chai
        .request(app)
        .post('/api/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal(
            'password must be a string'
          );
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a field has leading or trailing whitespace', function() {
      let spy = chai.spy();
      let newUser = {
        name: 'tim',
        password: ' 1234456789',
        email: 'timmy@turner.com'
      };
      return chai
        .request(app)
        .post('/api/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal(
            'password must not have any leading or trailing whitespace'
          );
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a username exists', function() {
      let spy = chai.spy();
      let newUser = {
        name: 'bobby',
        password: '1234456789',
        email: 'bob@bob.com'
      };
      return chai
        .request(app)
        .post('/api/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(400);
          expect(err.response.body.message).to.equal(
            'That email already exists'
          );
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a username is too short', function() {
      let spy = chai.spy();
      let newUser = { email: '', password: '1234456789', name: 'timmy turner' };
      return chai
        .request(app)
        .post('/api/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal(
            'email must be 5 characters or longer'
          );
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a password is too short', function() {
      let spy = chai.spy();
      let newUser = { name: '1', password: '1234', email: 'timmy@turner.com' };
      return chai
        .request(app)
        .post('/api/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal(
            'password must be 8 characters or longer'
          );
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });

    it('should return a 422 error when a password is too long', function() {
      let spy = chai.spy();
      let newUser = {
        name: '1',
        password:
          '1234kjdfhglkadjfhglksdjhfgklsdjfhgklsdjhfgkljsdfhglkjsdhfglksjhdfglksjdhfglkjsdhfgklsdjhfglakjshdf;sDJKF;KLAHDGKLJAHDFGLKJHDSFLKJDLKVJBALDBJVAUEHRVUHAELRIUHVAERLGHK',
        email: 'timmy@turner.com'
      };
      return chai
        .request(app)
        .post('/api/users')
        .send(newUser)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(422);
          expect(err.response.body.message).to.equal(
            'password must be 72 characters or smaller'
          );
        })
        .then(() => {
          expect(spy).to.have.not.been.called;
        });
    });
  });
});
