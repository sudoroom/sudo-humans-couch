const config = require('../config');
const express = require('express');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');
const shasum = require('shasum');
const moment = require('moment');
const { collectives } = require('../config');

function authenticateUser(req, res, next) {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: "not authorized" });
  }
};

function authenticateAdmin(req, res, next) {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.username !== config.users.default.username) {
      res.status(403).json({ error: "not authorized" });
    }
    next();
  } catch (err) {
    res.status(403).json({ error: "not authorized" });
  }
};

module.exports = async (couch) => {
  const dbs = await couch.db.list();
  const userDbExists = dbs.includes('users');
  
  let users;
  if (!userDbExists) {
    await couch.db.create('users');
    users = await couch.db.use('users');
    await users.createIndex({
      index: { fields: ['_id'] },
      name: 'user-by-id'
    });
    await users.createIndex({
      index: { fields: ['username'] },
      name: 'user-by-username'
    }); 
    const salt = crypto.randomBytes(16);
    const pwd = Buffer(config.users.default.password);
    const hash = shasum(Buffer.concat([salt,pwd]));
    const saltStr = salt.toString('hex');
    const now = moment().format('YYYY-MM-DD');
    const defaultUser = {...config.users.default, ...{
      createdAt: now,
      updatedAt: now,
      hash,
      salt: saltStr,
      password: undefined
    }};
    await users.insert(defaultUser);
  }
  users = couch.db.use('users');
  
  const router = express.Router();

  /** Create New User */
  router.post('/', 
    check('username')
      .exists().withMessage('username is required.')
      .isLength({ min: 3 }).withMessage('username is too short.')
      .isLength({ max: 16 }).withMessage('username is too long.')
      .custom(value => {
        return users.find({
          selector: {
            username: { '$eq': value }
          }
        }).then(user => {
          if (user) {
            return Promise.reject('username already in use.');
          }
        })
      }),
    check('password')
      .exists().withMessage('password is required.')
      .isLength({ min: 6 }).withMessage('password is too short.'),
    check('email')
      .exists().withMessage('email is required.')
      .isEmail().withMessage('email must valid address.')
      .custom(value => {
        return users.find({
          selector: {
            email: { '$eq': value }
          }
        }).then(user => {
          if (user) {
            return Promise.reject('email already in use.');
          }
        })
      }),
    check('visibility')
      .exists().withMessage('visibility is required.')
      .isIn(['everyone', 'accounts', 'members']).withMessage('visibility must be \'everyone\', \'accounts\' or \'members\''),
    check('collectives')
      .exists().withMessage('collectives are required.')
      .isLength({ min: 1}),
    check('collectives.*').isString().withMessage('each collective must be a string'),
    check('pronouns')
      .exists().withMessage('pronouns are req uired.')
      .isIn(['He/Him', 'She/Her', 'They/Them']).withMessage('pronouns must be \'He/Him\', \'She/Her\' or \'They/Them\''),
    check('fullName')
      .exists().withMessage('fullName is required.')
      .isLength({ min: 3 }).withMessage('fullName is too short.')
      .isLength({ max: 30 }).withMessage('fullName is too long.'),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.setHeader('content-type', 'application/problem+json');
        return res.status(400).json({ errors: errors.array() });
      }
      const salt = crypto.randomBytes(16);
      const pwd = Buffer(req.body.password);
      const hash = shasum(Buffer.concat([salt,pwd]));
      const saltStr = salt.toString('hex');
      const now = moment().format('YYYY-MM-DD');
      const newUser = {...req.body, ...{
        createdAt: now,
        updatedAt: now,
        hash,
        salt: saltStr
      }};
      const doc = await users.insert(newUser);
      res.json(doc);
  });

  /** Get All Users */
  router.get('/', authenticateAdmin, async (req, res) => {
    try {
      // const { rows } = await users.list({ include_docs: true });
      const query = {
        selector: {
          username: { '$gte': null }
        },
        fields: [
          '_id',
          'username',
          'email',
          'collectives',
          'visibility',
          'pronouns',
          'fullName'
        ]
      };
      const dbRes = await users.find(query);
      res.json(dbRes.docs);
    } catch (err) {
      res.setHeader('content-type', 'application/problem+json');
      if (err.statusCode === 404) {
        res.status(404).json({ error: "users not found" });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  /** Get User By ID */
  router.get('/:userId', authenticateAdmin, async (req, res) => {
    try {
      const doc = await users.get(req.params.userId);
      res.json(doc);
    } catch (err) {
      res.setHeader('content-type', 'application/problem+json');
      console.error(err);
      if (err.statusCode === 404) {
        res.status(404).json({ error: "User ID Not Found" });
      } else {
        res.status(err.statusCode).json({ error: err.message });
      }
    }
  });

  /** Update User By ID */
  router.put('/:userId', authenticateAdmin, async (req, res) => {
    try {
      if (!req.headers["x-document-rev"]) {
        const error = new Error("rev header required");
        error.statusCode = 400;
        throw error;  
      }
      const doc = await users.insert(req.body, req.headers["x-document-rev"]);
      res.json(doc);
    } catch (err) {
      res.setHeader('content-type', 'application/problem+json');
      if (err.statusCode === 409) {
        res.status(409).json({ error: err.description });
      } else {
        res.status(err.statusCode).json({ error: err.message });
      }
    }
  });

  /** Delete User By ID */
  router.delete('/:userId', authenticateAdmin, async (req, res) => {
    try {
      if (!req.headers["x-document-rev"]) {
        const error = new Error("rev header required");
        error.statusCode = 400;
        throw error;  
      }
      const doc = await users.destroy(req.params.userId, req.headers["x-document-rev"]);
      res.json(doc);
    } catch (err) {
      res.setHeader('content-type', 'application/problem+json');
      if (err.statusCode === 409) {
        res.status(409).json({ error: err.description });
      } else {
        res.status(err.statusCode).json({ error: err.message });
      }
    }
  });

  return { router, users };
};
