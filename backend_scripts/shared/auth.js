const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

function getIssuer() {
  const region = process.env.COGNITO_REGION || process.env.AWS_REGION;
  const poolId = process.env.COGNITO_USER_POOL_ID;
  if (!region || !poolId) {
    throw new Error('Missing COGNITO_REGION (or AWS_REGION) or COGNITO_USER_POOL_ID');
  }
  return `https://cognito-idp.${region}.amazonaws.com/${poolId}`;
}

let jwks;

function getJwks() {
  if (!jwks) {
    jwks = jwksClient({
      jwksUri: `${getIssuer()}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
  }
  return jwks;
}

function getKey(header, callback) {
  getJwks().getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * After issuer/signature check: ID tokens use `aud`; access tokens use `client_id`.
 */
function audienceMatches(decoded, clientId) {
  if (!clientId) return true;
  const aud = decoded.aud;
  const cid = decoded.client_id;
  if (aud === clientId) return true;
  if (Array.isArray(aud) && aud.includes(clientId)) return true;
  if (cid === clientId) return true;
  return false;
}

function verifyCognitoJwt(token) {
  const issuer = getIssuer();
  const clientId = process.env.COGNITO_APP_CLIENT_ID;

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) return reject(err);
        if (!decoded.sub) return reject(new Error('Invalid token: no sub'));
        if (!audienceMatches(decoded, clientId)) {
          return reject(new Error('Invalid token: audience/client_id mismatch'));
        }
        resolve(decoded);
      }
    );
  });
}

function getBearerToken(event) {
  const headers = event.headers || {};
  let h =
    headers.Authorization ||
    headers.authorization ||
    headers.AUTHORIZATION;

  if (!h && event.multiValueHeaders) {
    const mv =
      event.multiValueHeaders.Authorization ||
      event.multiValueHeaders.authorization;
    if (mv && mv[0]) h = mv[0];
  }

  if (!h || typeof h !== 'string') return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * User id from API Gateway after it validated the JWT (HTTP API JWT authorizer, REST Cognito
 * authorizer, or Lambda authorizer). No Cognito env vars needed on Lambda when this returns a value.
 */
function getSubFromApiGatewayAuthorizer(event) {
  const ctx = event.requestContext;
  if (!ctx) return null;
  const auth = ctx.authorizer;
  if (!auth) return null;

  const jwtClaims = auth.jwt?.claims;
  if (jwtClaims?.sub) return String(jwtClaims.sub);

  const claims = auth.claims;
  if (claims && typeof claims === 'object' && claims.sub) {
    return String(claims.sub);
  }

  if (auth.sub) return String(auth.sub);

  return null;
}

async function requireUserId(event) {
  const fromGateway = getSubFromApiGatewayAuthorizer(event);
  if (fromGateway) return fromGateway;

  const token = getBearerToken(event);
  const poolId = process.env.COGNITO_USER_POOL_ID;
  const region = process.env.COGNITO_REGION || process.env.AWS_REGION;

  if (poolId && region) {
    if (!token) {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      throw err;
    }
    try {
      const decoded = await verifyCognitoJwt(token);
      return decoded.sub;
    } catch (e) {
      const err = new Error('Unauthorized');
      err.statusCode = 401;
      err.cause = e;
      throw err;
    }
  }

  const err = new Error(
    token
      ? 'Unauthorized: set COGNITO_USER_POOL_ID and COGNITO_REGION (or AWS_REGION) on Lambda to verify the Bearer token, or configure API Gateway JWT authorizer to forward claims (sub).'
      : 'Unauthorized: missing Bearer token or requestContext.authorizer claims (sub).'
  );
  err.statusCode = 401;
  throw err;
}

module.exports = {
  verifyCognitoJwt,
  getBearerToken,
  requireUserId,
  getIssuer,
};
