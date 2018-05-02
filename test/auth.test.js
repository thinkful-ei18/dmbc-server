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
const { User } = require('../models/user');
const seedUsers = require('../db/seed/users');

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

  describe('POST /login', function() {
    it('should return an auth token with a valid login', function() {
      const userInfo = { email: 'bob@bob.com', password: 'thepriceisright' };
      return chai
        .request(app)
        .post('/api/login')
        .send(userInfo)
        .then(response => {
          expect(response).to.have.status(200);
          expect(response.body.authToken).to.not.eql(null);
        });
    });

    it('should 401 error with an invalid email', function() {
      const userInfo = { email: 'bobby1@bob.com', password: 'thepriceisright' };
      return chai
        .request(app)
        .post('/api/login')
        .send(userInfo)
        .catch(err => {
          expect(err).to.have.status(401);
          expect(err.response.body.message).to.equal('Unauthorized');
        });
    });

    it('should 401 error with an invalid password', function() {
      const userInfo = { email: 'bob@bob.com', password: 'thepriceisrigh' };
      return chai
        .request(app)
        .post('/api/login')
        .send(userInfo)
        .catch(err => {
          expect(err).to.have.status(401);
          expect(err.response.body.message).to.equal('Unauthorized');
        });
    });

    it('should catch errors and respond properly', function() {
      const spy = chai.spy();
      sandbox.stub(express.response, 'json').throws('TypeError');
      const userInfo = { email: 'bob@bob.com', password: 'thepriceisright' };
      return chai
        .request(app)
        .post('/api/login')
        .send(userInfo)
        .then(spy)
        .catch(err => {
          expect(err).to.have.status(500);
        })
        .then(() => {
          expect(spy).to.not.have.been.called();
        });
    });
  });
});
