/**
 * Party Lambda URLs. Priority:
 * 1. Each `VITE_API_PARTY_*` set to a full URL (highest priority).
 * 2. `VITE_API_GATEWAY_URL` (or `VITE_API_BASE_URL`) + HTTP API paths: one Lambda per
 *    function name, e.g. `https://....amazonaws.com/default/searchUser`
 *    (stage `default` + route = folder name under `backend_scripts/`).
 * 3. Dev only: same-origin `/api/aws/<functionName>` → Vite proxy (see vite.config.js).
 */
export function buildPartyApiEnv() {
  const fromExplicit = {
    searchUrl: import.meta.env.VITE_API_PARTY_SEARCH_URL || '',
    inviteUrl: import.meta.env.VITE_API_PARTY_INVITE_URL || '',
    invitesIncomingUrl: import.meta.env.VITE_API_PARTY_INVITES_INCOMING_URL || '',
    acceptUrl: import.meta.env.VITE_API_PARTY_ACCEPT_URL || '',
    declineUrl: import.meta.env.VITE_API_PARTY_DECLINE_URL || '',
    partiesMeUrl: import.meta.env.VITE_API_PARTY_PARTIES_ME_URL || '',
    leaveUrl: import.meta.env.VITE_API_PARTY_LEAVE_URL || '',
    dissolveUrl: import.meta.env.VITE_API_PARTY_DISSOLVE_URL || '',
  };
  if (Object.values(fromExplicit).every(Boolean)) {
    return fromExplicit;
  }

  const baseRaw =
    import.meta.env.VITE_API_GATEWAY_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    '';
  const base = baseRaw.replace(/\/$/, '');

  if (base) {
    return {
      searchUrl: `${base}/searchUser`,
      inviteUrl: `${base}/partyInvite`,
      invitesIncomingUrl: `${base}/partyInvitesIncoming`,
      acceptUrl: `${base}/partyInviteAccept`,
      declineUrl: `${base}/partyInviteDecline`,
      partiesMeUrl: `${base}/partyListMine`,
      leaveUrl: `${base}/partyLeave`,
      dissolveUrl: `${base}/partyDissolve`,
    };
  }

  if (import.meta.env.DEV) {
    const p = '/api/aws';
    return {
      searchUrl: `${p}/searchUser`,
      inviteUrl: `${p}/partyInvite`,
      invitesIncomingUrl: `${p}/partyInvitesIncoming`,
      acceptUrl: `${p}/partyInviteAccept`,
      declineUrl: `${p}/partyInviteDecline`,
      partiesMeUrl: `${p}/partyListMine`,
      leaveUrl: `${p}/partyLeave`,
      dissolveUrl: `${p}/partyDissolve`,
    };
  }

  return fromExplicit;
}

export function isPartyApiConfigured(env) {
  return Object.values(env).every(Boolean);
}
