const config = require('./config');
const http = require('http');
const https = require('https');
const nano = require('nano');

module.exports = () => {
  
  let agent;
  if (config.server.protocol === 'https') {
    agent = new https.Agent({
      ca: config.ssl.cert,
      rejectUnauthorized: true,
      keepAlive: true,
      maxSockets: 25
    })
  } else {
    agent = new http.Agent({
      keepAlive: true,
      maxSockets: 25
    })
  }
  const { username, password, host, port } = config.couch;
  const couchOptions = {
    url: `${config.server.protocol}://${username}:${password}@${host}:${port}`,
    requestDefaults : { agent }
  };
  const couch = nano(couchOptions);
  return couch;
};