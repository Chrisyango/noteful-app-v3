'use strict';

const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

const Note = require('../models/note');

mongoose.connect(MONGODB_URI)
  .then(() => {
    const searchTerm = 'lady gaga';
    let filter = {};
    let projection = {};
    let sort = 'created';

    if (searchTerm) {
      filter.$text = {$search: searchTerm};
      projection.score = {$meta: 'textScore'};
      sort = projection;
    }

    return Note.find(filter, projection)
      .select('title content')
      .sort(sort)
      .then(results => {
        console.log(results);
      })
      .catch(console.error);
  })
  .then(() => {
    return mongoose.disconnect()
      .then(() => {
        console.info('Disconnected');
      });
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });