/**
 * Backend contract (adjust Lambdas to match). All calls send Authorization: Bearer.
 *
 * GET  searchUrl?nickname=...
 *   → [{ userId, nickname }] (or legacy { users: [...] })
 *
 * POST inviteUrl  { toUserId, partyId? }
 *   partyId omitted → first invite (creates party); included → leader adds to existing party
 *   → { partyId, inviteId }
 *
 * GET  invitesIncomingUrl
 *   → { invites: [{ inviteId, partyId, fromUserId, fromNickname, fromUsername, fromAvatarId? }] }
 *
 * POST acceptUrl  { inviteId }
 * POST declineUrl { inviteId }
 *
 * GET  partiesMeUrl
 *   → { parties: [{
 *        partyId, leaderId, name?,
 *        members: [{ userId, nickname, username, avatarId?, role: 'leader'|'member' }],
 *        sharedQuest?: { title, description?, completedCount, totalCount }
 *      }] }
 *
 * POST leaveUrl    { partyId }
 * POST dissolveUrl { partyId }  // leader only
 */

function searchUrlWithNickname(base, nickname) {
  if (!base) return '';
  try {
    const u = base.startsWith('http')
      ? new URL(base)
      : new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    u.searchParams.set('nickname', nickname);
    return u.toString();
  } catch {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}nickname=${encodeURIComponent(nickname)}`;
  }
}

async function authJson(method, url, idToken, body) {
  if (!url) return { ok: false, error: 'API URL not configured', data: null };
  const headers = { Authorization: `Bearer ${idToken}` };
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined && method !== 'GET' && method !== 'HEAD' ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const base = data?.error || data?.message || text || `HTTP ${res.status}`;
    const err =
      res.status === 403
        ? `${base} — API Gateway rejected the request (JWT/Cognito authorizer: issuer, audience = app client id, token type).`
        : base;
    return { ok: false, error: err, data };
  }
  return { ok: true, data };
}

export function createPartyClient(env) {
  const {
    searchUrl,
    inviteUrl,
    invitesIncomingUrl,
    acceptUrl,
    declineUrl,
    partiesMeUrl,
    leaveUrl,
    dissolveUrl,
  } = env;

  return {
    searchUsers: async (idToken, nickname) => {
      const r = await authJson('GET', searchUrlWithNickname(searchUrl, nickname), idToken);
      if (!r.ok) return r;
      const raw = r.data;
      const users = Array.isArray(raw) ? raw : raw?.users ?? raw?.results ?? [];
      return { ok: true, data: { users: Array.isArray(users) ? users : [] } };
    },

    sendInvite: (idToken, payload) => authJson('POST', inviteUrl, idToken, payload),

    listIncomingInvites: (idToken) => authJson('GET', invitesIncomingUrl, idToken),

    acceptInvite: (idToken, inviteId) => authJson('POST', acceptUrl, idToken, { inviteId }),

    declineInvite: (idToken, inviteId) => authJson('POST', declineUrl, idToken, { inviteId }),

    listMyParties: (idToken) => authJson('GET', partiesMeUrl, idToken),

    leaveParty: (idToken, partyId) => authJson('POST', leaveUrl, idToken, { partyId }),

    dissolveParty: (idToken, partyId) => authJson('POST', dissolveUrl, idToken, { partyId }),
  };
}
