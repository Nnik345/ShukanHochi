const { USER_DETAILS } = require('./collections');

async function getUserSummary(db, userId) {
  const u = await db.collection(USER_DETAILS).findOne(
    { userId },
    { projection: { userId: 1, username: 1, nickname: 1, avatarId: 1 } }
  );
  if (!u) {
    return {
      userId,
      nickname: userId,
      username: '',
      avatarId: 'wizard',
    };
  }
  return {
    userId: u.userId,
    nickname: u.nickname || u.username || userId,
    username: u.username || '',
    avatarId: typeof u.avatarId === 'string' && u.avatarId.trim() ? u.avatarId.trim() : 'wizard',
  };
}

module.exports = { getUserSummary };
