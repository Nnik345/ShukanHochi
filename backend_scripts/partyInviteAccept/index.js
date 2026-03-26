const { MongoClient } = require('mongodb');
const { requireUserId } = require('../shared/auth');
const { PARTIES, PARTY_INVITES } = require('../shared/collections');

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

    const invites = db.collection(PARTY_INVITES);
    const parties = db.collection(PARTIES);

    const inv = await invites.findOne({ inviteId, toUserId: sub });
    if (!inv) {
      return corsJson(404, { error: 'Invite not found' });
    }

    const party = await parties.findOne({ partyId: inv.partyId });
    if (!party) {
      await invites.deleteOne({ inviteId });
      return corsJson(404, { error: 'Party no longer exists' });
    }

    await parties.updateOne(
      { partyId: inv.partyId },
      { $addToSet: { memberIds: sub }, $set: { updatedAt: new Date() } }
    );
    await invites.deleteOne({ inviteId });

    return corsJson(200, { ok: true, partyId: inv.partyId });
  } catch (err) {
    if (err.statusCode === 401) return corsJson(401, { error: 'Unauthorized' });
    console.error(err);
    return corsJson(500, { error: err.message });
  }
};
