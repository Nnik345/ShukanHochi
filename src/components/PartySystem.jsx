import { useCallback, useEffect, useMemo, useState } from 'react';
import AvatarDisplay from './AvatarDisplay';
import { createPartyClient } from '../api/partyClient';
import { buildPartyApiEnv, isPartyApiConfigured } from '../config/partyApiEnv';

export default function PartySystem({ bearerToken, myUserId }) {
  const partyEnv = useMemo(() => buildPartyApiEnv(), []);
  const partyApi = useMemo(() => createPartyClient(partyEnv), [partyEnv]);
  const configured = useMemo(() => isPartyApiConfigured(partyEnv), [partyEnv]);

  const [parties, setParties] = useState([]);
  const [invites, setInvites] = useState([]);
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState([]);
  /** null = default to first led party in UI; '' = new party; string = party id */
  const [inviteTargetPartyId, setInviteTargetPartyId] = useState(null);

  const leaderParties = useMemo(
    () => parties.filter(p => p.leaderId === myUserId),
    [parties, myUserId]
  );

  const refresh = useCallback(async () => {
    if (!bearerToken || !configured) return;
    setBusy(true);
    try {
      const [pr, ir] = await Promise.all([
        partyApi.listMyParties(bearerToken),
        partyApi.listIncomingInvites(bearerToken),
      ]);
      if (pr.ok) {
        const list = pr.data?.parties ?? pr.data?.items ?? [];
        setParties(Array.isArray(list) ? list : []);
      } else {
        setBanner(pr.error || 'Could not load parties');
      }
      if (ir.ok) {
        const list = ir.data?.invites ?? ir.data?.incoming ?? [];
        setInvites(Array.isArray(list) ? list : []);
      }
    } finally {
      setBusy(false);
    }
  }, [bearerToken, configured, partyApi]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (leaderParties.length === 0) {
      setInviteTargetPartyId('');
      return;
    }
    setInviteTargetPartyId((prev) => {
      if (prev === '' || prev === null) return prev;
      const ids = new Set(leaderParties.map((p) => p.partyId));
      return ids.has(prev) ? prev : leaderParties[0].partyId;
    });
  }, [leaderParties]);

  async function runSearch(e) {
    e.preventDefault();
    setBanner('');
    const q = searchQ.trim();
    if (!q || !bearerToken) return;
    setBusy(true);
    const res = await partyApi.searchUsers(bearerToken, q);
    setBusy(false);
    if (!res.ok) {
      setSearchHits([]);
      setBanner(res.error || 'Search failed');
      return;
    }
    const users = res.data?.users ?? res.data?.results ?? [];
    setSearchHits(Array.isArray(users) ? users : []);
  }

  async function sendInvite(toUserId) {
    if (toUserId === myUserId) {
      setBanner("You can't invite yourself.");
      return;
    }
    setBanner('');
    const resolvedPartyId =
      inviteTargetPartyId === null && leaderParties.length
        ? leaderParties[0].partyId
        : inviteTargetPartyId;
    const payload = { toUserId };
    const useExisting =
      resolvedPartyId &&
      leaderParties.some((p) => p.partyId === resolvedPartyId);
    if (useExisting) payload.partyId = resolvedPartyId;

    setBusy(true);
    const res = await partyApi.sendInvite(bearerToken, payload);
    setBusy(false);
    if (!res.ok) {
      setBanner(res.error || 'Invite failed');
      return;
    }
    setBanner(useExisting ? 'Invite sent.' : 'Invite sent — new party created when they accept.');
    await refresh();
  }

  async function accept(inviteId) {
    setBusy(true);
    const res = await partyApi.acceptInvite(bearerToken, inviteId);
    setBusy(false);
    if (!res.ok) setBanner(res.error || 'Accept failed');
    else await refresh();
  }

  async function decline(inviteId) {
    setBusy(true);
    const res = await partyApi.declineInvite(bearerToken, inviteId);
    setBusy(false);
    if (!res.ok) setBanner(res.error || 'Decline failed');
    else await refresh();
  }

  async function leave(partyId) {
    setBusy(true);
    const res = await partyApi.leaveParty(bearerToken, partyId);
    setBusy(false);
    if (!res.ok) setBanner(res.error || 'Leave failed');
    else await refresh();
  }

  async function dissolve(partyId) {
    if (!window.confirm('Dissolve this party for everyone? This cannot be undone.')) return;
    setBusy(true);
    const res = await partyApi.dissolveParty(bearerToken, partyId);
    setBusy(false);
    if (!res.ok) setBanner(res.error || 'Dissolve failed');
    else await refresh();
  }

  if (!configured) {
    return (
      <div className="card party-system">
        <h3 className="section-title">👥 Party</h3>
        <p className="party-config-hint">
          Set <code className="party-env-code">VITE_API_GATEWAY_URL</code> (e.g. <code className="party-env-code">…/default</code>) or each <code className="party-env-code">VITE_API_PARTY_*</code> URL.
        </p>
      </div>
    );
  }

  if (!bearerToken) {
    return (
      <div className="card party-system">
        <h3 className="section-title">👥 Party</h3>
        <p className="party-config-hint">Sign in to use parties.</p>
      </div>
    );
  }

  return (
    <div className="card party-system">
      <div className="party-system-head">
        <h3 className="section-title">👥 Party</h3>
        <button type="button" className="party-refresh-btn" onClick={() => refresh()} disabled={busy}>
          Refresh
        </button>
      </div>

      {banner ? <p className="party-banner">{banner}</p> : null}

      {invites.length > 0 && (
        <div className="party-invites-block">
          <h4 className="party-subtitle">Invites for you</h4>
          <ul className="party-invite-list">
            {invites.map((inv) => (
              <li key={inv.inviteId} className="party-invite-row">
                <div className="party-invite-from">
                  <AvatarDisplay
                    avatarId={inv.fromAvatarId}
                    size={40}
                    className="party-invite-avatar"
                  />
                  <div>
                    <div className="party-invite-name">
                      {inv.fromNickname || 'Player'}
                      {inv.fromUsername ? (
                        <span className="party-invite-username"> @{inv.fromUsername}</span>
                      ) : null}
                    </div>
                    <div className="party-invite-meta">Party invite</div>
                  </div>
                </div>
                <div className="party-invite-actions">
                  <button type="button" className="party-btn party-btn--primary" onClick={() => accept(inv.inviteId)} disabled={busy}>
                    Accept
                  </button>
                  <button type="button" className="party-btn" onClick={() => decline(inv.inviteId)} disabled={busy}>
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="party-invite-tools">
        <h4 className="party-subtitle">Invite by nickname</h4>
        <p className="party-hint">
          First invite to a new group creates the party and makes you leader. Only the leader can invite more members.
        </p>
        {leaderParties.length > 0 && (
          <label className="party-select-label">
            Add to party
            <select
              className="party-select"
              value={
                inviteTargetPartyId === null
                  ? leaderParties[0]?.partyId ?? ''
                  : inviteTargetPartyId
              }
              onChange={(e) =>
                setInviteTargetPartyId(e.target.value === '' ? '' : e.target.value)
              }
            >
              <option value="">New party (you become leader)</option>
              {leaderParties.map((p) => (
                <option key={p.partyId} value={p.partyId}>
                  {p.name || p.partyId} (leader)
                </option>
              ))}
            </select>
          </label>
        )}
        <form className="party-search-form" onSubmit={runSearch}>
          <input
            className="party-search-input"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search nickname…"
          />
          <button type="submit" className="party-btn party-btn--primary" disabled={busy}>
            Search
          </button>
        </form>
        {searchHits.length > 0 && (
          <ul className="party-search-results">
            {searchHits.map((u) => (
              <li key={u.userId} className="party-search-row">
                <AvatarDisplay avatarId={u.avatarId} size={36} />
                <div className="party-search-meta">
                  <span className="party-search-nick">{u.nickname || u.userId}</span>
                  {u.username != null && u.username !== '' ? (
                    <span className="party-search-user"> @{u.username}</span>
                  ) : null}
                </div>
                {u.userId !== myUserId ? (
                  <button type="button" className="party-btn party-btn--small" onClick={() => sendInvite(u.userId)} disabled={busy}>
                    Invite
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="party-list-block">
        <h4 className="party-subtitle">My parties</h4>
        {parties.length === 0 ? (
          <p className="party-empty-list">No parties yet. Send an invite to start one.</p>
        ) : (
          <ul className="party-cards">
            {parties.map((p) => {
              const isLeader = p.leaderId === myUserId;
              const members = Array.isArray(p.members) ? p.members : [];
              const sq = p.sharedQuest;
              return (
                <li key={p.partyId} className="party-card">
                  <div className="party-card-head">
                    <span className="party-card-title">{p.name || `Party ${p.partyId?.slice(0, 8) || ''}`}</span>
                    {isLeader ? <span className="party-leader-badge">Leader</span> : <span className="party-member-badge">Member</span>}
                  </div>

                  {sq && (sq.title || sq.name) ? (
                    <div className="shared-quest party-shared-quest">
                      <span className="quest-icon">📜</span>
                      <div>
                        <div className="quest-name">Shared quest: {sq.title || sq.name}</div>
                        {sq.description ? <div className="quest-desc">{sq.description}</div> : null}
                        {typeof sq.completedCount === 'number' && typeof sq.totalCount === 'number' ? (
                          <div className="quest-progress">
                            {sq.completedCount}/{sq.totalCount} members completed
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="party-no-shared-quest">No shared quest for this party yet.</div>
                  )}

                  <ul className="party-members">
                    {members.map((m) => {
                      const isMe = m.userId === myUserId;
                      return (
                        <li key={m.userId} className={`member ${isMe ? 'you' : ''}`}>
                          <AvatarDisplay avatarId={m.avatarId} size={32} />
                          <span className="member-name">
                            {isMe ? 'You' : m.nickname || m.userId}
                            {!isMe && m.username ? (
                              <span className="member-username"> @{m.username}</span>
                            ) : null}
                          </span>
                          <span className="member-role">{m.role === 'leader' || m.userId === p.leaderId ? '★' : ''}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="party-card-actions">
                    <button type="button" className="leave-party-btn" onClick={() => leave(p.partyId)} disabled={busy}>
                      Leave party
                    </button>
                    {isLeader ? (
                      <button type="button" className="dissolve-party-btn" onClick={() => dissolve(p.partyId)} disabled={busy}>
                        Dissolve party
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
