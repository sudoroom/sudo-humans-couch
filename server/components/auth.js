const config = require('../config');
const express = require('express');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const shasum = require('shasum');

module.exports = (app, couch) => {

  const users = couch.db.use('users');

  /** Authenticate to receive JWT */
  app.post('/api/v1/authenticate', 
    check('username').exists().withMessage('Name is required.'),
    check('password').exists().withMessage('Password is required.'),
    async (req, res) => {
      const errors = validationResult(req );
      if (!errors.isEmpty()) {
        res.setHeader('content-type', 'application/problem+json');
        return res.status(400).json({ errors: errors.array() });
      }
      const { username, password } = req.body;
      const {docs} = await users.find({
        selector: {
          'username': { '$eq': username }
        }
      }).catch(err => null);
      if (!docs.length) {
        res.sendStatus(403);
      }
      const user = docs[0];
      const salt = Buffer(user.salt,'hex')
      let pwd = Buffer(password)
      let tryHash = shasum(Buffer.concat([salt,pwd]))
      if( user.hash !== tryHash ) {
        res.sendStatus(403)
      }
      const token = jwt.sign({...user, ...{ hash: undefined, salt: undefined }}, config.jwt.secret, { expiresIn: config.jwt.expires });
      res.json({ token });
    }
  );

};
