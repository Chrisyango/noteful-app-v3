'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const chaiSpies = require('chai-spies');
const expect = chai.expect;

chai.use(chaiHttp);
chai.use(chaiSpies);

const mongoose = require('mongoose');
const {TEST_MONGODB_URI} = require('../config');
const seedTags = require('../db/seed/tags');
const Tag = require('../models/tag');

before(function() {
  return mongoose.connect(TEST_MONGODB_URI, {autoIndex: false});
});

beforeEach(function() {
  return Tag.insertMany(seedTags);
});

afterEach(function () {
  return mongoose.connection.db.dropDatabase();
});

after(function() {
  return mongoose.disconnect();
});

describe('GET v3/tags', function() {
  it('should return all the tags', function() {
    const dbPromise = Tag.find();
    const apiPromise = chai.request(app).get('/v3/tags');

    return Promise.all([dbPromise, apiPromise])
      .then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);

        res.body.forEach(function (tag) {
          expect(tag).to.be.an('object');
          expect(tag).to.have.keys('id', 'name');
        });
      });
  });

  it('should respond with 400 error for invalid id', function() {
    const badId = '99-99-99';
    const spy = chai.spy();
    return chai.request(app)
      .get(`/v3/tags/${badId}`)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        const res = err.response;
        expect(res).to.have.status(400);
      });
  });
});

describe('GET v3/tags/:id', function() {
  it('should return tags with correct id', function() {
    let data;
    return Tag.findOne()
      .select('id name')
      .then(_data => {
        data = _data;
        return chai.request(app).get(`/v3/tags/${data.id}`);
      })
      .then(res => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys('id', 'name');

        expect(res.body.name).to.equal(data.name);
        expect(res.body.id).to.equal(data.id);
      });
  });

  it('should respond with error 400 for invalid id', function() {
    const badId = '02135468';
    const spy = chai.spy();
    return chai.request(app).get(`/v3/tags/${badId}`)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        const res = err.response;
        expect(res).to.have.status(400);
      });
  });
});

describe('POST v3/tags', function() {
  it('should create and return a new tag', function() {
    const newTag = {
      name: 'Hello'
    };
    let body;
    return chai.request(app)
      .post('/v3/tags')
      .send(newTag)
      .then(function (res) {
        body = res.body;
        expect(res).to.have.status(201);
        expect(res).to.be.json;
        expect(body).to.be.an('object');
        expect(body).to.include.keys('id', 'name');

        return Tag.findById(body.id);
      })
      .then(data => {
        expect(body.title).to.equal(data.title);
        expect(body.content).to.equal(data.content);
      });
  });

  it('should respond with error when given invalid tag', function() {
    const newTag = {
      foo: 'bar'
    };
    const spy = chai.spy();
    return chai.request(app)
      .post('/v3/tags')
      .send(newTag)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        const res = err.response;
        expect(res).to.have.status(400);
      });
  });
});

describe('PUT v3/tags/:id', function() {
  it('should update the tag', function() {
    const updateTag = {
      name: 'Whaddup',
    };
    let data;
    return Tag.findOne().select('id name')
      .then(_data => {
        data = _data;
        return chai.request(app)
          .put(`/v3/tags/${data.id}`)
          .send(updateTag);
      })
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys('id', 'name');

        expect(res.body.id).to.equal(data.id);
        expect(res.body.name).to.equal(data.name);
      });
  });

  it('should respond with en error for bad id', function() {
    const updateTag = {
      name: 'Whaddup'
    };
    const badId = '99-99-99';
    const spy = chai.spy();
    return chai.request(app)
      .put(`/v3/tags/${badId}`)
      .send(updateTag)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        const res = err.response;
        expect(res).to.have.status(400);
      });
  });

  it('should respond with an error for missing field', function() {
    const updateTag = {
      foo: 'bar'
    };
    const spy = chai.spy();
    return chai.request(app)
      .put('/v3/tags/9999')
      .send(updateTag)
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        const res = err.response;
        expect(res).to.have.status(400);
      });
  });
});

describe('DELETE v3/tags', function() {
  it('should delete an item by id', function () {
    let data;
    return Tag.findOne()
      .select('id name')
      .then(_data => {
        data = _data;
        return chai.request(app)
          .delete(`/v3/tags/${data.id}`);
      })
      .then(function (res) {
        expect(res).to.have.status(204);
      });
  });

  it('should respond with a 404 for an invalid id', function () {
    const spy = chai.spy();
    return chai.request(app)
      .delete('/v3/tags/AAAAAAAAAAAAAAAAAAAAAAAA')
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        expect(err.response).to.have.status(404);
      });
  });
});