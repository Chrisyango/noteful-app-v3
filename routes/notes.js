'use strict';

const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const Note = require('../models/note');

/* ========== GET/READ ALL ITEM ========== */
router.get('/notes', (req, res, next) => {
  const {searchTerm, folderId, tagId} = req.query;
  let filter = {};
  let projection = {};
  let sort = 'created';

  if (folderId) {
    let folderFilter = {'folderId': `${folderId}`};
    Object.assign(filter, folderFilter);
  }

  if (tagId) {
    let tagFilter = {'tags': `${tagId}`};
    Object.assign(filter, tagFilter);
  }

  if (searchTerm) {
    filter.$text = {$search: searchTerm};
    projection.score = {$meta: 'textScore'};
    sort = projection;
  }

  Note.find(filter, projection)
    .populate('tags', 'name')
    .select('title content created folderId tags.name')
    .sort(sort)
    .then(results => {
      res.json(results);
    })
    .catch(next);
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/notes/:id', (req, res, next) => {
  const {id} = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findById(id)
    .populate('tags', 'name')
    .select('id title content folderId tags.name')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(next);
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/notes', (req, res, next) => {
  const {title, content, folderId, tags} = req.body;

  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  tags.forEach(tagId => {
    if (!mongoose.Types.ObjectId.isValid(tagId)) {
      const err = new Error('The `tags id` is not valid');
      err.status = 400;
      return next(err);
    }
  });

  const newItem = {title, content, folderId, tags};

  Note.create(newItem)
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(next);
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/notes/:id', (req, res, next) => {
  const {id} = req.params;
  const {title, content, folderId, tags} = req.body;

  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  tags.forEach(tagId => {
    if(!mongoose.Types.ObjectId.isValid(tagId)) {
      const err = new Error('The `tags id` is not valid');
      err.status = 400;
      return next(err);
    }
  });
 
  const updateItem = {title, content, folderId, tags};

  // Note.findByIdAndUpdate(id, updateItem, {new: true})
  //   .select('id title content')
  //   .then(result => {
  //     if (result) {
  //       res.json(result);
  //     } else {
  //       next();
  //     }
  //   })
  //   .catch(next);

  Note.findByIdAndUpdate(id, updateItem)
    .select('id title content')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(next);
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/notes/:id', (req, res, next) => {
  const {id} = req.params;

  Note.findByIdAndRemove(id)
    .then(count => {
      if (count) {
        res.status(204).end();
      } else {
        next();
      }
    })
    .catch(next);
});

module.exports = router;