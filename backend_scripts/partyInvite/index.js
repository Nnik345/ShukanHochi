const { randomUUID } = require('crypto');
const { MongoClient } = require('mongodb');
const { requireUserId } = require('../shared/auth');
const { USER_DETAILS, PARTIES, PARTY_INVITES } = require('../shared/collections');

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
    const toUserId = body.toUserId;
    const partyId = body.partyId || body.party_id || null;

    if (!toUserId || typeof toUserId !== 'string') {
      return corsJson(400, { error: 'Missing toUserId' });
    }
    if (toUserId === sub) {
      return corsJson(400, { error: 'Cannot invite yourself' });
    }

    const parties = db.collection(PARTIES);
    const invites = db.collection(PARTY_INVITES);

    const target = await db.collection(USER_DETAILS).findOne({ userId: toUserId });
    if (!target) {
      return corsJson(404, { error: 'User not found' });
    }

    if (!partyId) {
      const newPartyId = randomUUID();

      await parties.insertOne({
        partyId: newPartyId,
        leaderId: sub,
        memberIds: [sub],
        name: null,
        sharedQuest: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const inviteId = randomUUID();
      await invites.insertOne({
        inviteId,
        partyId: newPartyId,
        fromUserId: sub,
        toUserId,
        createdAt: new Date(),
      });

      return corsJson(200, { partyId: newPartyId, inviteId });
    }

    const party = await parties.findOne({ partyId });
    if (!party) {
      return corsJson(404, { error: 'Party not found' });
    }
    if (party.leaderId !== sub) {
      return corsJson(403, { error: 'Only the party leader can invite members' });
    }
    if (party.memberIds.includes(toUserId)) {
      return corsJson(400, { error: 'User is already a member' });
    }

    const pending = await invites.findOne({ partyId, toUserId });
    if (pending) {
      return corsJson(409, { error: 'Invite already pending' });
    }

    const inviteId = randomUUID();
    await invites.insertOne({
      inviteId,
      partyId,
      fromUserId: sub,
      toUserId,
      createdAt: new Date(),
    });

    return corsJson(200, { partyId, inviteId });
  } catch (err) {
    if (err.statusCode === 401) return corsJson(401, { error: 'Unauthorized' });
    if (err.code === 11000) {
      return corsJson(409, { error: 'Duplicate invite' });
    }
    console.error(err);
    return corsJson(500, { error: err.message });
  }
};
