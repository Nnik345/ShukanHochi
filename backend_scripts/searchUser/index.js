const { MongoClient } = require('mongodb');
const { escapeRegex } = require('../shared/strings');

let client;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

function corsJson(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
    body: JSON.stringify(body),
  };
}

function corsEmpty(statusCode) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: '',
  };
}

function getHttpMethod(event) {
  return (
    event.httpMethod ||
    event.requestContext?.http?.method ||
    ''
  ).toUpperCase();
}

async function getClient() {
  if (client && client.topology && client.topology.isConnected()) {
    return client;
  }
  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  return client;
}

exports.handler = async (event) => {
  const method = getHttpMethod(event);

  if (method === 'OPTIONS') {
    return corsEmpty(204);
  }

  try {
    const mongoClient = await getClient();

    const db = mongoClient.db('QuestHabit');
    const users = db.collection('UserDetails');

    const query =
      event.queryStringParameters?.nickname ||
      (typeof event.body === 'string'
        ? JSON.parse(event.body || '{}').nickname
        : event.body && typeof event.body === 'object'
          ? event.body.nickname
          : '') ||
      '';

    if (!query) {
      return corsJson(200, []);
    }

    const safe = escapeRegex(query);
    const results = await users
      .find({
        nickname: { $regex: `^${safe}`, $options: 'i' },
      })
      .limit(10)
      .toArray();

    const response = results.map((user) => ({
      userId: user.userId,
      nickname: user.nickname,
    }));

    return corsJson(200, response);
  } catch (err) {
    console.error(err);
    return corsJson(500, { error: err.message });
  }
};
