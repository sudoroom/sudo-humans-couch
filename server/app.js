const config = require('./config');
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const swaggerUI = require('swagger-ui-express');

main();

async function main() {
  try {
    const couch = require('./database')(); 

    // instantiate express
    const app = express();

    /* app settings */
    
    // remove express header
    app.disable('x-powered-by');
    // remove weak etags
    app.disable('etag');

    /* application middleware */
    
    // parse json requests
    app.use(express.json());

    // view specifications
    const openAPIDocument = require('./sudo-humans.json');
    app.use('/api/v1/explorer', swaggerUI.serve, swaggerUI.setup(openAPIDocument));

    /* Routes */

    // collectives
    const { router: collectiveRouter } = await require('./components/collectives')(couch);
    app.use('/api/v1/collectives', collectiveRouter);

    // users 
    const { router: userRouter } = await require('./components/users')(couch);
    app.use('/api/v1/users', userRouter);

    // auth 
    require('./components/auth')(app, couch);

    const { protocol, host, port } = config.server;
    const server = protocol === "https" ?
      https.createServer({
        key: fs.readFileSync(config.ssl.key),
        cert: fs.readFileSync(config.ssl.cert),
      }, app) :
      http.createServer(app);

    await server.listen(config.server.port);
    console.log(`api listening on ${protocol}://${host}:${port}/api/v1`);
    console.log(`api explorer ${protocol}://${host}:${port}/api/v1/explorer`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}