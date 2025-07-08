// auth/lichess-oauth.js
const { AuthorizationCode, generators } = require('simple-oauth2');

const client = new AuthorizationCode({
  client: {
    id: process.env.LICHESS_CLIENT_ID,
    secret: process.env.LICHESS_CLIENT_SECRET,
  },
  auth: {
    tokenHost: 'https://lichess.org',
    authorizePath: '/oauth',
    tokenPath: '/api/token',
  },
});

const redirectUri = process.env.LICHESS_REDIRECT_URI;

module.exports = {
  oauth2: client,
  generators,
  redirectUri,
};
