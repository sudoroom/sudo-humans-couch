require('dotenv').config();

const {
  PROTOCOL,
  HOST,
  PORT,
  SSL_KEY_PATH,
  SSL_CERT_PATH,
  COUCH_HOST,
  COUCH_PORT,
  COUCH_USERNAME,
  COUCH_PASSWORD,
  DEFAULT_USER_USERNAME,
  DEFAULT_USER_PASSWORD,
  DEFAULT_USER_EMAIL,
  DEFAULT_USER_VISIBILITY,
  DEFAULT_USER_PRONOUNS,
  DEFAULT_USER_FULL_NAME,
  JWT_SECRET,
  JWT_EXPIRES,
  DEFAULT_COLLECTIVE_NAME
  } = process.env;

const defaultUserName = DEFAULT_USER_USERNAME || 'admin';
const defaultCollectiveName = process.env.DEFAULT_COLLECTIVE_NAME || 'Sudo Room';

const config = {
  server: {
    protocol: PROTOCOL || 'http',
    host: HOST || 'localhost',
    port: PORT || '3000',
  },
  ssl: {
    key: SSL_KEY_PATH || '',
    cert: SSL_CERT_PATH || ''
  },
  couch: {
    host: COUCH_HOST || 'localhost',
    port: COUCH_PORT || 5984,
    username: COUCH_USERNAME || '',
    password: COUCH_PASSWORD || ''
  },
  jwt: {
    secret: JWT_SECRET,
    expires: JWT_EXPIRES || '1800s'
  },
  users: {
    default: {
      username: defaultUserName,
      password: DEFAULT_USER_PASSWORD || 'changeme',
      email: DEFAULT_USER_EMAIL || '',
      visibility: DEFAULT_USER_VISIBILITY || 'accounts',
      collectives: [defaultCollectiveName],
      pronouns: DEFAULT_USER_PRONOUNS || 'They/Them',
      fullName: DEFAULT_USER_FULL_NAME || 'Sudo Humans Admin'
    }
  },
  collectives: {
    default: {
      name: DEFAULT_COLLECTIVE_NAME || 'Sudo Room',
      members: [defaultUserName],
      admins: [defaultUserName]
    }
  }
};

module.exports = config;
