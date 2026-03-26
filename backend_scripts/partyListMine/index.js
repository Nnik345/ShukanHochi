const { MongoClient } = require('mongodb');
const { requireUserId } = require('../shared/auth');
const { getUserSummary } = require('../shared/users');
const { PARTIES } = require('../shared/collections');

let client;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
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

    const sub = await requireUserId(event);
    const rows = await db.collection(PARTIES).find({ memberIds: sub }).toArray();

    const parties = [];
    for (const p of rows) {
      const members = [];
      for (const uid of p.memberIds || []) {
        const u = await getUserSummary(db, uid);
        members.push({
          ...u,
          role: uid === p.leaderId ? 'leader' : 'member',
        });
      }
      parties.push({
        partyId: p.partyId,
        leaderId: p.leaderId,
        name: p.name ?? null,
        members,
        sharedQuest: p.sharedQuest ?? null,
      });
    }

    return corsJson(200, { parties });
  } catch (err) {
    if (err.statusCode === 401) return corsJson(401, { error: 'Unauthorized' });
    console.error(err);
    return corsJson(500, { error: err.message });
  }
};
