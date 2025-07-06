var express = require('express');
var router = express.Router();
const lichess_credentials = require('./utils/lichess_credentials');

const simpleOauth = require('simple-oauth2');
const axios = require('axios');

var md5 = require('md5');

const scopes = [
  // 'email:read'
  // 'preference:read',
  // 'challenge:read',
];

const redirectUri = `${lichess_credentials.url}/lichess_auth/callback`;
/* --- Lichess config --- */
const tokenHost = 'https://oauth.lichess.org';
const authorizePath = '/oauth/authorize';
const tokenPath = '/oauth';
/* --- End of lichess config --- */
// const oauth2 = simpleOauth.create({
//   client: {
//     id: lichess_credentials.clientId,
//     secret: lichess_credentials.clientSecret,
//   },
//   auth: {
//     tokenHost,
//     tokenPath,
//     authorizePath,
//   },
// });

const oauth2 = simpleOauth.create({
  client: {
    id: lichess_credentials.clientId,
  },
  auth: {
    authorizeHost: 'https://lichess.org',
    authorizePath: '/oauth',
    tokenHost: 'https://lichess.org',
    tokenPath: '/api/token',
  },
  options: {
    // send params in the request body
    authorizationMethod: 'body',
  },
});

async function generatePKCECodes() {
  // 1) make a random string of allowed characters
  const output = new Uint32Array(RECOMMENDED_CODE_VERIFIER_LENGTH);
  crypto.getRandomValues(output);
  const codeVerifier = Array.from(output)
    .map((num) => PKCE_CHARSET[num % PKCE_CHARSET.length])
    .join('');

  // 2) hash it
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier)
  );

  // 3) turn the hash into a binary string
  const hashArray = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < hashArray.byteLength; i++) {
    binary += String.fromCharCode(hashArray[i]);
  }

  // 4) base64url-encode the digest → this is the code challenge
  const codeChallenge = base64urlEncode(binary);

  // 5) return _both_ verifier & challenge
  return { codeVerifier, codeChallenge };
}

/**
 * Implements *base64url-encode* (RFC 4648 § 5) without padding, which is NOT
 * the same as regular base64 encoding.
 */
function base64urlEncode(value) {
  let base64 = btoa(value);
  base64 = base64.replace(/\+/g, '-');
  base64 = base64.replace(/\//g, '_');
  base64 = base64.replace(/=/g, '');
  return base64;
}
const PKCE_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

const RECOMMENDED_CODE_VERIFIER_LENGTH = 96;
// module.exports = function (app, passport, pool) {
// Show the "log in with lichess" button
// app.get('/', (req, res) => res.send('Hello<br><a href="/auth">Log in with lichess</a>'));
let pkce;
// Initial page redirecting to Lichess
router.get('/auth', async (req, res) => {
  //   const { codeChallenge, codeVerifier } = await generatePKCECodes();
  const state = Math.random().toString(36).substring(2);
  //   const authorizationUri = `${tokenHost}${authorizePath}?response_type=code&client_id=${
  //     lichess_credentials.clientId
  //   }&redirect_uri=${redirectUri}&scope=${scopes.join(
  //     '%20'
  //   )}&state=${state}&code_challenge_method=S256&code_challenge=${encodeURIComponent(codeChallenge)}`;
  //   console.log(authorizationUri);

  const { codeVerifier, codeChallenge } = await generatePKCECodes();
  pkce = codeVerifier;

  const authorizationUri = oauth2.authorizationCode.authorizeURL({
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.status(200).json({ authorizationUri });
});

// Redirect URI: parse the authorization token and ask for the access token
router.get('/callback', async (req, res) => {
  try {
    function getUserInfo(token) {
      return axios.get('/api/account', {
        baseURL: 'https://lichess.org/',
        headers: { Authorization: 'Bearer ' + token.access_token },
      });
    }

    console.log(req.query.code, pkce);

    const result = await oauth2.authorizationCode.getToken({
      code: req.query.code,
      redirect_uri: redirectUri,
      code_verifier: pkce,
    });
    console.log(result);

    const token = oauth2.accessToken.create(result);
    const userInfo = await getUserInfo(token.token);
    console.log(userInfo);

    res.status(200).json({ data: userInfo.data });

    function getLanguage(str) {
      try {
        return userInfo.data.language.split('-')[1];
      } catch (e) {
        return 'RU';
      }
    }
    var insertId, user_id, foundSocialTable;

    // pool
    //   .query(
    //     'SELECT * FROM social_user WHERE net_uid = ?',
    //     userInfo.data.username
    //   )
    //   .then((rows) => {
    //     console.log(rows);
    //     console.log(req.query.code.length);
    //     if (rows.length > 0) {
    //       foundSocialTable = true;
    //     } else {
    //       foundSocialTable = false;
    //     }
    //     return pool.query('SELECT * FROM users WHERE name = ?', [
    //       userInfo.data.username,
    //     ]);
    //   })
    //   .then((rows) => {
    //     if (rows.length === 0) {
    //       let theme = {
    //         email: userInfo.data.username,
    //         password: md5(userInfo.data.username),
    //         name: userInfo.data.username,
    //         image: '/images/user.png',
    //         country: getLanguage(userInfo),
    //         rating: 1600,
    //         school_id: null,
    //         tournaments_rating: 1600,
    //       };

    //       return pool.query('INSERT INTO users SET ?', theme);
    //     } else {
    //       if (foundSocialTable) {
    //         return req.login(rows[0], () => {});
    //       } else {
    //         res.render('lichess_login_error', {
    //           username: userInfo.data.username,
    //         });
    //       }
    //     }
    //   })
    //   .then((results) => {
    //     if (!!results && results.insertId > 0) {
    //       insertId = results.insertId;
    //       return pool
    //         .query('INSERT INTO social_user SET ?', {
    //           user_id: insertId,
    //           net: 'lichess',
    //           net_uid: userInfo.data.username,
    //         })
    //         .then(function () {
    //           return pool.query(
    //             'SELECT * FROM users WHERE id = ?',
    //             insertId
    //           );
    //         })
    //         .then(function (rows) {
    //           req.login(rows[0], () => {});
    //         })
    //         .catch(function (err) {
    //           console.log(err);
    //         });
    //     }
    //   })
    //   .then((results) => {
    //     res.redirect('/');
    //   })
    //   .catch(function (err) {
    //     console.log(err);
    //   });

    // res.send(`<h1>Success!</h1>Your lichess user info: <pre>${JSON.stringify(userInfo.data)}</pre>`);
  } catch (error) {
    console.error('Access Token Error', error);
    res.status(500).json('Authentication failed');
  }
});

router.get('/', function (req, res) {
  var page = req.query.page || null;
  var limit_start = 0,
    limit = 20;
  page = parseInt(page, 10);
  if (typeof page === 'undefined' || !Number.isInteger(page)) {
    page = 1;
  }
  limit_start = page * limit - limit;

  pool.query(
    'SELECT COUNT(*) as count FROM users WHERE is_hidden = 0',
    function (err, result, fields) {
      var sql1 =
        'SELECT users.* FROM users WHERE is_hidden = 0 AND id = school_id ORDER BY tournaments_rating DESC LIMIT ?,?';

      pool
        .query(sql1, [limit_start, limit])
        .then((rows) => {
          var total = result[0].count,
            pageSize = limit,
            pageCount = total / pageSize;

          res.render('user/users', {
            users: rows,
            countries: countries,
            count: result[0].count,
            online: app.globalPlayers,
            total: total,
            pageSize: pageSize,
            currentPage: page,
            pageCount: pageCount,
          });
        })
        .catch(function (err) {
          console.log(err);
        });
    }
  );
});

//   return router;
// };

module.exports = router;
