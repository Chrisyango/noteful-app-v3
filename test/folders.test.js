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
const seedFolders = require('../db/seed/folders');
const Folder = require('../models/folder');

before(function() {
  return mongoose.connect(TEST_MONGODB_URI, {autoIndex: false});
});

beforeEach(function() {
  return Folder.insertMany(seedFolders);
});

afterEach(function () {
  return mongoose.connection.db.dropDatabase();
});

after(function() {
  return mongoose.disconnect();
});

describe('Reality Check', () => {

  it('true should be true', () => {
    expect(true).to.be.true;
  });

  it('2 + 2 should equal 4 (except in 1984)', () => {
    expect(2 + 2).to.equal(4);
  });

});

describe('Environment', () => {

  it('NODE_ENV should be "test"', () => {
    expect(process.env.NODE_ENV).to.equal('test');
  });

});

describe('Basic Express setup', () => {

  describe('Express static', () => {

    it('GET request "/" should return the index page', () => {
      return chai.request(app)
        .get('/')
        .then(function (res) {
          expect(res).to.exist;
          expect(res).to.have.status(200);
          expect(res).to.be.html;
        });
    });

  });

  describe('404 handler', () => {

    it('should respond with 404 when given a bad path', () => {
      const spy = chai.spy();
      return chai.request(app)
        .get('/bad/path')
        .then(spy)
        .then(() => {
          expect(spy).to.not.have.been.called();
        })
        .catch(err => {
          expect(err.response).to.have.status(404);
        });
    });

  });
});

describe('GET v3/folders', function() {
  it('should return all the folders', function() {
    const dbPromise = Folder.find();
    const apiPromise = chai.request(app).get('/v3/folders');

    return Promise.all([dbPromise, apiPromise])
      .then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);

        res.body.forEach(function (note) {
          expect(note).to.be.an('object');
          expect(note).to.have.keys('id', 'name');
        });
      });
  });

  it('should respond with 400 error for invalid id', function() {
    const badId = '99-99-99';
    const spy = chai.spy();
    return chai.request(app)
      .get(`/v3/folders/${badId}`)
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

describe('GET v3/folders/:id', function() {
  it('should return note with correct id', function() {
    let data;
    return Folder.findOne()
      .select('id name')
      .then(_data => {
        data = _data;
        return chai.request(app).get(`/v3/folders/${data.id}`);
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
    return chai.request(app).get(`/v3/folders/${badId}`)
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

describe('POST v3/folders', function() {
  it('should create and return a new folder', function() {
    const newFolder = {
      name: 'Hello'
    };
    let body;
    return chai.request(app)
      .post('/v3/folders')
      .send(newFolder)
      .then(function (res) {
        body = res.body;
        expect(res).to.have.status(201);
        expect(res).to.be.json;
        expect(body).to.be.an('object');
        expect(body).to.include.keys('id', 'name');

        return Folder.findById(body.id);
      })
      .then(data => {
        expect(body.title).to.equal(data.title);
        expect(body.content).to.equal(data.content);
      });
  });

  it('should respond with error when given invalid folder', function() {
    const newFolder = {
      foo: 'bar'
    };
    const spy = chai.spy();
    return chai.request(app)
      .post('/v3/folders')
      .send(newFolder)
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

describe('PUT v3/folders/:id', function() {
  it('should update the folder', function() {
    const updateFolder = {
      name: 'Whaddup',
    };
    let data;
    return Folder.findOne().select('id name')
      .then(_data => {
        data = _data;
        return chai.request(app)
          .put(`/v3/folders/${data.id}`)
          .send(updateFolder);
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
    const updateFolder = {
      name: 'Whaddup'
    };
    const badId = '99-99-99';
    const spy = chai.spy();
    return chai.request(app)
      .put(`/v3/folders/${badId}`)
      .send(updateFolder)
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
    const updateFolder = {
      foo: 'bar'
    };
    const spy = chai.spy();
    return chai.request(app)
      .put('/v3/folders/9999')
      .send(updateFolder)
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

describe('DELETE v3/folders', function() {
  it('should delete an item by id', function () {
    let data;
    return Folder.findOne()
      .select('id name')
      .then(_data => {
        data = _data;
        return chai.request(app)
          .delete(`/v3/folders/${data.id}`);
      })
      .then(function (res) {
        expect(res).to.have.status(204);
      });
  });

  it('should respond with a 404 for an invalid id', function () {
    const spy = chai.spy();
    return chai.request(app)
      .delete('/v3/folders/AAAAAAAAAAAAAAAAAAAAAAAA')
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        expect(err.response).to.have.status(404);
      });
  });
});