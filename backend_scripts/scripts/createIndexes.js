/**
 * One-time index setup. Run locally (or from CI) with:
 *   MONGO_URI="..." DB_NAME="QuestHabit" node scripts/createIndexes.js
 * DB_NAME defaults to QuestHabit if unset (same as fetch/update Lambdas).
 */
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGO_URI;
  const name = process.env.DB_NAME || 'QuestHabit';
  if (!uri) {
    console.error('Set MONGO_URI');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(name);

  const userDetails = db.collection('UserDetails');
  await userDetails.createIndex({ userId: 1 }, { unique: true });
  await userDetails.createIndex({ nickname: 1 });

  const parties = db.collection('parties');
  await parties.createIndex({ partyId: 1 }, { unique: true });
  await parties.createIndex({ leaderId: 1 });
  await parties.createIndex({ memberIds: 1 });

  const invites = db.collection('partyInvites');
  await invites.createIndex({ inviteId: 1 }, { unique: true });
  await invites.createIndex({ toUserId: 1 });
  await invites.createIndex({ partyId: 1 });
  await invites.createIndex(
    { partyId: 1, toUserId: 1 },
    { unique: true, name: 'party_pending_invite_unique' }
  );

  console.log(`Indexes ensured on db "${name}" (UserDetails + parties + partyInvites).`);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
