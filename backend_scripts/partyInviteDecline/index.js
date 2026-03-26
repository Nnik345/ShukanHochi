const { MongoClient } = require('mongodb');
const { requireUserId } = require('../shared/auth');
const { PARTY_INVITES } = require('../shared/collections');

let client;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function corsJson(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
    body: JSON.stringify(bodyObj),
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
  if (client?.topology?.isConnected?.()) return client;
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

    const body = JSON.parse(
      typeof event.body === 'string' ? event.body || '{}' : '{}'
    );

    const sub = await requireUserId(event);
    const inviteId = body.inviteId;
    if (!inviteId) {
      return corsJson(400, { error: 'Missing inviteId' });
    }

    const r = await db.collection(PARTY_INVITES).deleteOne({ inviteId, toUserId: sub });
    if (r.deletedCount === 0) {
      return corsJson(404, { error: 'Invite not found' });
    }

    return corsJson(200, { ok: true });
  } catch (err) {
    if (err.statusCode === 401) return corsJson(401, { error: 'Unauthorized' });
    console.error(err);
    return corsJson(500, { error: err.message });
  }
};
