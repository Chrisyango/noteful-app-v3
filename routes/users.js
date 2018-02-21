'use strict';

const express = require('express');
const router = express.Router();

const User = require('../models/user');

/* ========== POST/CREATE AN ITEM ========== */
router.post('/users', (req, res, next) => {
  const {fullname, username, password} = req.body;

  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => {
    !(field in req.body);
  });
  const nonTrimmedField = requiredFields.find(field => {
    req.body[field].trim() !== req.body[field];
  });

  if (missingField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Missing field',
      location: missingField
    });
  }
  if (nonTrimmedField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Field cannot start or end with whitespace',
      location: nonTrimmedField
    });
  }

  const stringFields = ['username', 'password', 'fullname'];
  const nonStringField = stringFields.find(field => {
    field in req.body && typeof req.body[field] !== 'string';
  });

  if (nonStringField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: 'Incorrect field type: expected string',
      location: nonStringField
    });
  }

  const fieldSize = {
    username: {
      min: 1
    },
    password: {
      min: 8,
      max: 72
    }
  };

  const tooSmallField = Object.keys(fieldSize).find(field => {
    'min' in fieldSize[field] && 
      req.body[field].length >= fieldSize[field].min;
  });

  const tooLargeField = Object.keys(fieldSize).find(field => {
    'max' in fieldSize[field] &&
      req.body[field].length <= fieldSize[field].max;
  });

  if (tooSmallField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: `Username or Password needs to be at least 
      ${fieldSize[tooSmallField].min} characters long`,
      location: tooSmallField
    });
  }

  if (tooLargeField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: `Username or Password needs to be at most 
      ${fieldSize[tooLargeField].max} characters long`,
      location: tooLargeField
    });
  }

  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname
      };
      return User.create(newUser);
    })
    .then(result => {
      return res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
      }
      next(err);
    });

  // const newItem = {fullname, username, password};

  // User.create(newItem)
  //   .then(result => {
  //     res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
  //   })
  //   .catch(next);
});

module.exports = router;