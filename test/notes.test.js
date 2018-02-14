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
const seedNotes = require('../db/seed/notes');
const Note = require('../models/note');

before(function() {
  return mongoose.connect(TEST_MONGODB_URI, {autoIndex: false});
});

beforeEach(function() {
  return Note.insertMany(seedNotes)
    .then(() => {
      Note.ensureIndexes();
    });
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

describe('GET v3/notes', function() {
  it('should return all the notes', function() {
    const dbPromise = Note.find();
    const apiPromise = chai.request(app).get('/v3/notes');

    return Promise.all([dbPromise, apiPromise])
      .then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(data.length);

        res.body.forEach(function (note) {
          expect(note).to.be.an('object');
          expect(note).to.have.keys('id', 'title', 'content');
        });
      });
  });

  it('should return correct search results', function() {
    const term = 'gaga';
    const dbPromise = Note.find(
      {$text: {$search: term}},
      {score: {$meta: 'textScore'}})
      .sort({score: {$meta: 'textScore'}});
    const apiPromise = chai.request(app).get(`/v3/notes?searchTerm=${term}`);

    return Promise.all([dbPromise, apiPromise])
      .then(([data, res]) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.a('array');
        expect(res.body).to.have.length(1);
        expect(res.body[0]).to.be.an('object');
        expect(res.body[0].id).to.equal(data[0].id);
      });
  });

  it('should respond with 400 error for invalid id', function() {
    const badId = '99-99-99';
    const spy = chai.spy();
    return chai.request(app)
      .get(`/v3/notes/${badId}`)
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

describe('GET v3/notes/:id', function() {
  it('should return note with correct id', function() {
    let data;
    return Note.findOne()
      .select('id title content')
      .then(_data => {
        data = _data;
        return chai.request(app).get(`/v3/notes/${data.id}`);
      })
      .then(res => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys('id', 'title', 'content');

        expect(res.body.title).to.equal(data.title);
        expect(res.body.content).to.equal(data.content);
        expect(res.body.id).to.equal(data.id);
      });
  });

  it('should respond with error 400 for invalid id', function() {
    const badId = '02135468';
    const spy = chai.spy();
    return chai.request(app).get(`/v3/notes/${badId}`)
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

describe('POST v3/notes', function() {
  it('should create and return a new item', function() {
    const newNote = {
      title: 'Hello',
      content: 'Hi'
    };
    let body;
    return chai.request(app)
      .post('/v3/notes')
      .send(newNote)
      .then(function (res) {
        body = res.body;
        expect(res).to.have.status(201);
        expect(res).to.be.json;
        expect(body).to.be.an('object');
        expect(body).to.include.keys('id', 'title', 'content');

        return Note.findById(body.id);
      })
      .then(data => {
        expect(body.title).to.equal(data.title);
        expect(body.content).to.equal(data.content);
      });
  });

  it('should respond with error when given invalid note', function() {
    const newNote = {
      foo: 'bar'
    };
    const spy = chai.spy();
    return chai.request(app)
      .post('/v3/notes')
      .send(newNote)
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

describe('PUT v3/notes/:id', function() {
  it('should update the note', function() {
    const updateNote = {
      title: 'Whaddup',
      content: 'Nothing much'
    };
    let data;
    return Note.findOne().select('id title content')
      .then(_data => {
        data = _data;
        return chai.request(app)
          .put(`/v3/notes/${data.id}`)
          .send(updateNote);
      })
      .then((res) => {
        expect(res).to.have.status(200);
        expect(res).to.be.json;
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys('id', 'title', 'content');

        expect(res.body.id).to.equal(data.id);
        expect(res.body.title).to.equal(data.title);
        expect(res.body.content).to.equal(data.content);
      });
  });

  it('should respond with en error for bad id', function() {
    const updateNote = {
      title: 'Whaddup',
      content: 'Nothing much'
    };
    const badId = '99-99-99';
    const spy = chai.spy();
    return chai.request(app)
      .put(`/v3/notes/${badId}`)
      .send(updateNote)
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
    const updateNote = {
      foo: 'bar'
    };
    const spy = chai.spy();
    return chai.request(app)
      .put('/v3/notes/9999')
      .send(updateNote)
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

describe('DELETE v3/notes', function() {
  // it('should delete an item by id', function () {
  //   let data;
  //   return Note.findOne().select('id title content')
  //     .then(_data => {
  //       data = _data;
  //       return chai.request(app)
  //         .delete(`/v3/notes/${_data.id}`);
  //     })
  //     .then(function (res) {
  //       expect(res).to.have.status(204);
  //     });
  // });

  it('should respond with a 404 for an invalid id', function () {
    it('should delete an item by id', function () {
      let data;
      return Note.findOne().select('id title content')
        .then(_data => {
          data = _data;
          return chai.request(app).delete(`/v3/notes/${data.id}`);
        })
        .then(function (res) {
          expect(res).to.have.status(204);
        });
    });
    
    const spy = chai.spy();
    return chai.request(app)
      .delete('/v3/notes/AAAAAAAAAAAAAAAAAAAAAAAA')
      .then(spy)
      .then(() => {
        expect(spy).to.not.have.been.called();
      })
      .catch(err => {
        expect(err.response).to.have.status(404);
      });
  });
});