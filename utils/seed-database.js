'use strict';

const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
const Note = require('../models/note');

const seedFolders = require('../db/seed/folders');
const seedTags = require('../db/seed/tags');
const seedNotes = require('../db/seed/notes');

mongoose.connect(MONGODB_URI)
  .then(() => {
    return mongoose.connection.db.dropDatabase()
      .then(result => {
        console.info(`Dropped Database: ${result}`);
      });
  })
  .then(() => {
    return Folder.insertMany(seedFolders)
      .then(results => {
        console.info(`Inserted ${results.length} Folders`);
      });
  })
  .then(() => {
    return Tag.insertMany(seedTags)
      .then(results => {
        console.info(`Inserted ${results.length} Tags`);
      });
  })
  .then(() => {
    return Note.insertMany(seedNotes)
      .then(results => {
        console.info(`Inserted ${results.length} Notes`);
      });
  })
  .then(() => {
    return Note.createIndexes();
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