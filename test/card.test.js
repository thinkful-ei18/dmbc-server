'use strict';
const express = require('express');
const app = require('../index');
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSpies = require('chai-spies');
const expect = chai.expect;
const jwt = require('jsonwebtoken');

chai.use(chaiHttp);
chai.use(chaiSpies);

const mongoose = require('mongoose');
const { TEST_DATABASE_URL, JWT_SECRET } = require('../config');
const { Card } = require('../models/card');
const seedCards = require('../db/seed/cards');
const { User } = require('../models/user');
const seedUsers = require('../db/seed/users');

const sinon = require('sinon');
const sandbox = sinon.createSandbox();
describe('Card Test', function() {
  let token;
  before(function() {
    return mongoose.connect(TEST_DATABASE_URL, { autoIndex: false });
  });

  beforeEach(function() {
    return Card.insertMany(seedCards)
      .then(() => Card.ensureIndexes())
      .then(() => User.insertMany(seedUsers))
      .then(() => User.ensureIndexes())
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
        .get('/api/cards')
        .then(() => expect.fail(null, null, 'Request should not succeed'))
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(401);
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
            .get('/api/cards')
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

    it('Should reject requests with an expired token', function() {
      return User.findById('322222222222222222222200')
        .then(response => {
          return jwt.sign(
            {
              user: {
                email: response.email,
                id: response.id
              },
              expiresIn: Math.floor(Date.now() / 1000) - 10
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
            .get('/api/cards')
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
  });

  describe('GET /cards', function() {
    it('should return a list of all cards on the database', function() {
      let response;
      return chai
        .request(app)
        .get('/api/cards')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          response = _response;
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array');
          expect(response.body.length).to.eql(4);
          return Card.count();
        })
        .then(count => {
          expect(count).to.equal(response.body.length);
        });
    });

    it('should return a list of cards with searchterm', function() {
      let response;
      return chai
        .request(app)
        .get('/api/cards?searchTerm=test')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          response = _response;
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('array');
          expect(response.body.length).to.eql(2);
        });
    });

    it('should return the correct values', function() {
      let item;
      return chai
        .request(app)
        .get('/api/cards')
        .set('authorization', `Bearer ${token}`)
        .then(_response => {
          item = _response.body[0];
          return Card.findById(item.id);
        })
        .then(response => {
          expect(item.name).to.equal(response.name);
          expect(item.description).to.equal(response.description);
          expect(item.hours).to.equal(response.hours);
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .get('/api/cards')
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

  describe('GET cards/:id', function() {
    it('should return the proper card', function() {
      let itemId;
      return chai
        .request(app)
        .get('/api/cards')
        .set('authorization', `Bearer ${token}`)
        .then(response => {
          itemId = response.body[0].id;
          return chai
            .request(app)
            .get(`/api/cards/${itemId}`)
            .set('authorization', `Bearer ${token}`);
        })
        .then(response => {
          expect(response.body.id).to.equal(itemId);
          return Card.findById(itemId);
        })
        .then(card => {
          expect(card.id).to.equal(itemId);
        });
    });

    it('should send an error on a invalid id format', function() {
      let badId = '00000000000000000000000';
      const spy = chai.spy();
      return chai
        .request(app)
        .get(`/api/cards/${badId}`)
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should send a 404 error on a bad id', function() {
      let badId = '000000000000000000000009';
      const spy = chai.spy();
      return chai
        .request(app)
        .get(`/api/cards/${badId}`)
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(404);
          expect(res.body.message).to.equal('Not Found');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .get('/api/cards/000000000000000000000001')
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(404);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('GET cards/:ambassador', function() {
    it('should return cards belonging to ambassador', function() {
      return chai
        .request(app)
        .get('/api/cards/322222222222222222222200')
        .set('authorization', `Bearer ${token}`)
        .then(response => {
          expect(response.body.length).to.equal(4);
        })
    });

    it('should send an error on a invalid id format', function() {
      let badId = '00000000000000000000000';
      const spy = chai.spy();
      return chai
        .request(app)
        .get(`/api/cards/${badId}`)
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should send an 404 error on a bad id', function() {
      let badId = '000000000000000000000009';
      const spy = chai.spy();
      return chai
        .request(app)
        .get(`/api/cards/${badId}`)
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(404);
          expect(res.body.message).to.equal('Not Found');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .get('/api/cards/000000000000000000000001')
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(404);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('POST /cards', function() {
    it('should post a new card with proper attributes', function() {
      let newCard = {
        ambassador: [
          '322222222222222222222200'
        ],
        name: 'Foo Bar Test1',
        description: 'Bar of Foos',
        address: '1152 Foobar Street, BarFoo, FB',
        hours: '12pm - 8pm',
        rating: 4,
        id: '5ae8b12ea6177c18e4badabe'
      };

      return chai
        .request(app)
        .post('/api/cards')
        .set('authorization', `Bearer ${token}`)
        .send(newCard)
        .then(response => {
          expect(response).to.have.status(201);
          expect(response.body).to.be.an('object');
          expect(response.body.title).to.equal(newCard.name);
          expect(response.body.content).to.equal(newCard.description);
          return Card.count();
        })
        .then(response => {
          expect(response).to.equal(9);
        })
        .catch(err => {
          // console.log(err);
        });
    });

    it('should 400 error when not all fields are present', function() {
      let newCard = {
        ambassador: [
          '322222222222222222222200'
        ],
        description: 'Bar of Foos',
        address: '1152 Foobar Street, BarFoo, FB',
        hours: '12pm - 8pm',
        rating: 4,
        id: '5ae8b12ea6177c18e4badabe'
      };
      let spy = chai.spy();
      return chai
        .request(app)
        .post('/api/cards')
        .set('authorization', `Bearer ${token}`)
        .send(newCard)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal('Missing field');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      let newCard = {
        ambassador: [
          '322222222222222222222200'
        ],
        name: 'Foo Bar Test1',
        description: 'Bar of Foos',
        address: '1152 Foobar Street, BarFoo, FB',
        hours: '12pm - 8pm',
        rating: 4,
        id: '5ae8b12ea6177c18e4badabe'
      };
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .post('/api/cards/')
        .set('authorization', `Bearer ${token}`)
        .send(newCard)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('PUT cards/:id', function() {
    it('should update a card with proper validation', function() {
      let updateCard = {
        'ambassador': [
          '322222222222222222222200'
        ],
        'name': 'Foo Bar',
        'description': 'Bar of Foos',
        'address': '1152 Foobar Street, BarFoo, FB',
        'hours': '12pm - 8pm',
        'rating': [4],
        'id': '5ae8ad6ea9ea1724941f76ec',
        'tips': 'Something changed'
      };

      return chai
        .request(app)
        .put('/api/cards/5ae8ad6ea9ea1724941f76ec')
        .set('authorization', `Bearer ${token}`)
        .send(updateCard)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          expect(response.body.name).to.equal(updateCard.name);
          expect(response.body.id).to.equal(updateCard.id);
          return Card.findById(response.body.id);
        })
        .then(card => {
          expect(card.name).to.equal(updateCard.name);
          expect(card.id).to.equal(updateCard.id);
        });
    });

    it('should update a card\'s rating with proper validation', function() {
      let updateCard = {
        rating: 3
      };

      return chai
        .request(app)
        .put('/api/cards/5ae8ad6ea9ea1724941f76ec/rate')
        .set('authorization', `Bearer ${token}`)
        .send(updateCard)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          expect(response.body.rating.length).to.equal(2);
        });
    });

    it('should update a card\'s tips with proper validation', function() {
      let updateCard = {
        tips: 'something'
      };

      return chai
        .request(app)
        .put('/api/cards/5ae8ad6ea9ea1724941f76ec/tips')
        .set('authorization', `Bearer ${token}`)
        .send(updateCard)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body).to.be.an('object');
          expect(response.body.tips.length).to.equal(1);
        });
    });

    it('should not update card if body and param id do not match', function() {
      let updateCard = { name: 'Foo Bar', id: '5ae8ad6ea9ea1724941f76eb' };

      const spy = chai.spy();

      return chai
        .request(app)
        .put('/api/cards/5ae8ad6ea9ea1724941f76ec')
        .set('authorization', `Bearer ${token}`)
        .send(updateCard)
        .then(spy)
        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal(
            'Id\'s do not match'
          );
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should return 400 on invalid id', function() {
      let updateCard = { name: 'Foo Bar' };

      const spy = chai.spy();

      return chai
        .request(app)
        .put('/api/cards/00000000000000000000000')
        .set('authorization', `Bearer ${token}`)
        .send(updateCard)
        .then(spy)
        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal(
            'The `id` is not valid'
          );
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should return 404 with invalid id', function() {
      let updateCard = { name: 'Foo Bar', id: '000000000000000000000009' };
      const spy = chai.spy();

      return chai
        .request(app)
        .put('/api/cards/000000000000000000000009')
        .set('authorization', `Bearer ${token}`)
        .send(updateCard)
        .then(spy)
        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(404);
          expect(res.body.message).to.equal('Not Found');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should return 400 if rating is empty', function() {
      let updateCard = {};
      const spy = chai.spy();

      return chai
        .request(app)
        .put('/api/cards/5ae8ad6ea9ea1724941f76ec/rate')
        .set('authorization', `Bearer ${token}`)
        .send(updateCard)
        .then(spy)
        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Rating is empty');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should return 400 if rating is empty', function() {
      let updateCard = {};
      const spy = chai.spy();

      return chai
        .request(app)
        .put('/api/cards/5ae8ad6ea9ea1724941f76ec/tips')
        .set('authorization', `Bearer ${token}`)
        .send(updateCard)
        .then(spy)
        .catch(err => {
          let res = err.response;
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('Tips is empty');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      let updateCard = { title: 'Foo Bar', id: '000000000000000000000000' };
      sandbox.stub(express.response, 'json').throws('TypeError');
      return chai
        .request(app)
        .put('/api/cards/000000000000000000000000')
        .set('authorization', `Bearer ${token}`)
        .send(updateCard)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(400);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });

  describe('DELETE /cards/:id', function() {
    it('should delete a card with the proper id', function() {
      let id;

      return Card.findOne()
        .then(card => {
          id = card.id;
          return id;
        })
        .then(() => {
          return chai
            .request(app)
            .delete(`/api/cards/${id}`)
            .set('authorization', `Bearer ${token}`);
        })
        .then(response => {
          expect(response).to.have.status(204);
          return Card.findById(id);
        })
        .then(card => {
          expect(card).to.equal(null);
        });
    });

    it('should 404 with an id that does not exist', function() {
      const spy = chai.spy();

      return chai
        .request(app)
        .delete('/api/cards/000000000000000000000009')
        .set('authorization', `Bearer ${token}`)
        .then(spy)
        .catch(err => {
          const res = err.response;
          expect(res).to.have.status(404);
          expect(res.body.message).to.equal('Not Found');
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });
});