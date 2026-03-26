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
    const partyId = body.partyId;
    if (!partyId) {
      return corsJson(400, { error: 'Missing partyId' });
    }

    const parties = db.collection(PARTIES);
    const party = await parties.findOne({ partyId });
    if (!party) {
      return corsJson(404, { error: 'Party not found' });
    }
    if (!(party.memberIds || []).includes(sub)) {
      return corsJson(403, { error: 'Not a member of this party' });
    }
    if (party.leaderId === sub) {
      return corsJson(403, {
        error: 'Leader cannot leave; use dissolve or transfer leadership first.',
      });
    }

    await parties.updateOne(
      { partyId },
      { $pull: { memberIds: sub }, $set: { updatedAt: new Date() } }
    );
    await db.collection(PARTY_INVITES).deleteMany({ partyId, toUserId: sub });

    return corsJson(200, { ok: true });
  } catch (err) {
    if (err.statusCode === 401) return corsJson(401, { error: 'Unauthorized' });
    console.error(err);
    return corsJson(500, { error: err.message });
  }
};
