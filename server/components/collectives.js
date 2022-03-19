const config = require('../config');
const express = require('express');
const { check, validationResult } = require('express-validator');

module.exports = async (couch) => {
  const dbs = await couch.db.list();
  const collectivesDbExists = dbs.includes('collectives');
  
  let collectives;
  if (!collectivesDbExists) {
    await couch.db.create('collectives');
    collectives = await couch.db.use('collectives');
    await collectives.createIndex({
      index: { fields: ['_id', 'name'] },
      name: 'id-name-index'
    });
    await collectives.insert(config.collectives.default);
  }
  collectives = couch.db.use('collectives');
  
  const router = express.Router();

  /** Create New Collective */
  router.post('/', 
    check('name')
      .exists().withMessage('Name is required.')
      .isLength({ min: 3 }).withMessage('Name is too short.')
      .isLength({ max: 16 }).withMessage('Name is too long.'),
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.setHeader('content-type', 'application/problem+json');
        return res.status(400).json({ errors: errors.array() });
      }
      const doc = await collectives.insert(req.body);
      res.json(doc);
  });

  /** Get All Collectives */
  router.get('/', async (req, res) => {
    const { rows } = await collectives.list({ include_docs: true });
    res.json(rows.map(row => row.doc));
  });

  /** Get Collective By ID */
  router.get('/:collectiveId', async (req, res) => {
    try {
      const doc = await collectives.get(req.params.collectiveId);
      res.json(doc);
    } catch (err) {
      res.setHeader('content-type', 'application/problem+json');
      console.error(err);
      if (err.statusCode === 404) {
        res.status(404).json({ error: "Collective ID Not Found" });
      } else {
        res.status(err.statusCode).json({ error: err.message });
      }
    }
  });

  /** Update Collective By ID */
  router.put('/:collectiveId', async (req, res) => {
    try {
      if (!req.headers["x-document-rev"]) {
        const error = new Error("rev header required");
        error.statusCode = 400;
        throw error;  
      }
      const doc = await collectives.insert(req.body, req.headers["x-document-rev"]);
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

  /** Delete Collective By ID */
  router.delete('/:collectiveId', async (req, res) => {
    try {
      if (!req.headers["x-document-rev"]) {
        const error = new Error("rev header required");
        error.statusCode = 400;
        throw error;  
      }
      const doc = await collectives.destroy(req.params.collectiveId, req.headers["x-document-rev"]);
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

  return { router, collectives };
};
