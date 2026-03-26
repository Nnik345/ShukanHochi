import { useCallback, useMemo, useState } from 'react';
import { useAuth } from 'react-oidc-context';

function trimBase(url) {
  return (url || '').replace(/\/$/, '');
}

const gatewayBase = trimBase(
  import.meta.env.VITE_API_GATEWAY_URL || import.meta.env.VITE_API_BASE_URL || ''
);
const fetchLambda = import.meta.env.VITE_API_LAMBDA_FETCH || '';
const updateLambda = import.meta.env.VITE_API_LAMBDA_UPDATE || '';
const hasExplicitGateway = Boolean(import.meta.env.VITE_API_GATEWAY_URL);

const API_FETCH =
  import.meta.env.VITE_API_FETCH_URL ||
  (gatewayBase && fetchLambda ? `${gatewayBase}/${fetchLambda}` : '') ||
  (!hasExplicitGateway && gatewayBase ? gatewayBase : '');
const API_UPDATE =
  import.meta.env.VITE_API_UPDATE_URL ||
  (gatewayBase && updateLambda ? `${gatewayBase}/${updateLambda}` : '');

const XP_PER_LEVEL = 100;

function buildMongoUserBody(authUser, gameState) {
  const level = Math.floor(gameState.totalXp / XP_PER_LEVEL) + 1;
  const xp = gameState.totalXp % XP_PER_LEVEL;
  return {
    userId: authUser.sub,
    username: authUser.username,
    nickname: authUser.nickname || authUser.username,
    level,
    xp,
    streak: gameState.streak,
    unallocatedPoints: gameState.unallocatedPoints,
    stats: {
      strength: gameState.stats.str,
      intelligence: gameState.stats.int,
      dexterity: gameState.stats.dex,
    },
    quests: gameState.habits,
    combat: {
      stage: gameState.combat.stage,
      bossHp: gameState.combat.bossHp,
      mana: gameState.combat.mana,
    },
    lastCompletionDate: gameState.lastCompletionDate,
    updatedAt: new Date().toISOString(),
    avatarId: gameState.avatarId,
  };
}

export default function useBackend() {
  const auth = useAuth();

  const [apiState, setApiState] = useState({
    loading: false,
    payload: null,
  });

  const config = useMemo(
    () => ({
      clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      cognitoDomain: import.meta.env.VITE_COGNITO_DOMAIN || '',
      logoutUri: import.meta.env.VITE_COGNITO_LOGOUT_URI || `${window.location.origin}/`,
    }),
    []
  );

  const authState = useMemo(() => {
    const profile = auth.user?.profile || {};
    const username = profile['cognito:username'] || profile.username || profile.email || '';
    const nickname = profile.nickname || profile.preferred_username || '';
    const sub = profile.sub || '';

    return {
      loading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      user: auth.isAuthenticated ? { username, nickname, sub } : null,
      idToken: auth.user?.id_token || '',
      accessToken: auth.user?.access_token || '',
      message: auth.error
        ? `Cognito error: ${auth.error.message}`
        : auth.isAuthenticated
          ? 'Signed in.'
          : auth.isLoading
            ? 'Checking session...'
            : 'Sign in to load your profile.',
    };
  }, [auth.error, auth.isAuthenticated, auth.isLoading, auth.user]);

  function signInWithCognito() {
    auth.signinRedirect();
  }

  const saveToLambda = useCallback(async (gameState) => {
    if (!authState.isAuthenticated || !authState.user?.sub) return;

    const body = buildMongoUserBody(authState.user, gameState);

    if (!API_UPDATE) return;

    try {
      const response = await fetch(API_UPDATE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authState.idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        keepalive: true,
      });
      const text = await response.text();
      if (!response.ok) {
        console.error('[QuestHabit] updateUser HTTP error', response.status, text);
      }
    } catch (err) {
      // Typical cause cross-origin: CORS preflight failed (API Gateway must allow OPTIONS + ACAO)
      console.error('[QuestHabit] updateUser fetch failed (often CORS)', err);
    }
  }, [authState.isAuthenticated, authState.user, authState.idToken]);

  const saveToLambdaBeacon = useCallback((gameState) => {
    if (!authState.isAuthenticated || !authState.user?.sub || !API_UPDATE) return;

    const body = buildMongoUserBody(authState.user, gameState);

    navigator.sendBeacon(
      API_UPDATE,
      new Blob([JSON.stringify(body)], { type: 'application/json' })
    );
  }, [authState.isAuthenticated, authState.user]);

  async function signOutFromCognito(gameState) {
    await saveToLambda(gameState);

    auth.removeUser();

    if (config.cognitoDomain && config.clientId) {
      const logoutUrl = new URL(`https://${config.cognitoDomain}/logout`);
      logoutUrl.searchParams.set('client_id', config.clientId);
      logoutUrl.searchParams.set('logout_uri', config.logoutUri);
      window.location.assign(logoutUrl.toString());
    }
  }

  async function fetchProfileFromLambda() {
    if (!authState.isAuthenticated || !authState.user?.sub) return;

    setApiState({ loading: true, payload: null });

    if (!API_FETCH) {
      setApiState({ loading: false, payload: null });
      return;
    }

    try {
      const url = `${API_FETCH}?userId=${encodeURIComponent(authState.user.sub)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authState.idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);

      const json = await response.json();

      // Backend format: { userFound: true, data: userDoc } | { userFound: false }
      const profile =
        json?.userFound === true && json?.data && typeof json.data === 'object'
          ? json.data
          : null;

      setApiState({ loading: false, payload: profile });
    } catch (err) {
      console.error('[QuestHabit] fetchUserStats failed (often CORS)', err);
      setApiState({ loading: false, payload: null });
    }
  }

  return {
    authState,
    apiState,
    signInWithCognito,
    signOutFromCognito,
    fetchProfileFromLambda,
    saveToLambda,
    saveToLambdaBeacon,
  };
}
