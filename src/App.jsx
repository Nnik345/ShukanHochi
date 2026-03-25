import { useEffect, useCallback } from 'react';
import useGameState from './hooks/useGameState';
import Dashboard from './components/Dashboard';
import HabitList from './components/HabitList';
import BattleScene from './components/BattleScene';
import StatsPanel from './components/StatsPanel';
import PartySystem from './components/PartySystem';
import useBackend from './hooks/useBackendPlaceholders';
import './App.css';

export default function App() {
  const state = useGameState();
  const backend = useBackend();
  const { hydrateFromBackend, getSnapshot } = state;
  const displayName = backend.authState.user?.nickname || backend.authState.user?.username || state.username;

  useEffect(() => {
    if (backend.apiState.payload) {
      hydrateFromBackend(backend.apiState.payload);
    }
  }, [backend.apiState.payload, hydrateFromBackend]);

  const { fetchProfileFromLambda } = backend;
  useEffect(() => {
    if (backend.authState.isAuthenticated && !backend.apiState.loading) {
      fetchProfileFromLambda();
    }
  }, [backend.authState.isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const { saveToLambdaBeacon } = backend;
  useEffect(() => {
    if (!backend.authState.isAuthenticated) return;

    function handleBeforeUnload() {
      saveToLambdaBeacon(getSnapshot());
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [backend.authState.isAuthenticated, saveToLambdaBeacon, getSnapshot]);

  const handleLogout = useCallback(() => {
    backend.signOutFromCognito(getSnapshot());
  }, [backend, getSnapshot]);

  if (backend.authState.loading) {
    return (
      <div className="login-gate">
        <div className="card login-gate-card">
          <h1 className="logo">
            <span className="logo-icon">⚔️</span> QuestHabit
          </h1>
          <p className="login-gate-text">Checking session...</p>
        </div>
      </div>
    );
  }

  if (!backend.authState.isAuthenticated) {
    return (
      <div className="login-gate">
        <div className="card login-gate-card">
          <h1 className="logo">
            <span className="logo-icon">⚔️</span> QuestHabit
          </h1>
          <p className="login-gate-text">
            Sign in with AWS Cognito to load your account, stats, XP, stage progress, and streak.
          </p>
          <button className="auth-btn" onClick={backend.signInWithCognito}>
            Login with Cognito
          </button>
          <p className="backend-note">{backend.authState.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="logo">
          <span className="logo-icon">⚔️</span> QuestHabit
        </h1>
        <div className="header-controls">
          <button className="reset-btn" onClick={state.resetDaily}>
            🌅 New Day
          </button>
          <button className="auth-btn logout" onClick={handleLogout}>
            Logout ({displayName})
          </button>
        </div>
      </header>

      <main className="layout">
        <div className="col-left">
          <Dashboard
            username={displayName}
            level={state.level}
            xp={state.xp}
            xpToNext={state.xpToNext}
            streak={state.streak}
            tier={state.tier}
            unallocatedPoints={state.unallocatedPoints}
          />
          <HabitList
            habits={state.habits}
            addHabit={state.addHabit}
            completeHabit={state.completeHabit}
            deleteHabit={state.deleteHabit}
          />
        </div>
        <div className="col-right">
          <BattleScene
            combat={state.combat}
            combatLog={state.combatLog}
            bossDefeatedFlash={state.bossDefeatedFlash}
            maxMana={state.maxMana}
            dpsStats={state.dpsStats}
          />
          <StatsPanel
            stats={state.stats}
            unallocatedPoints={state.unallocatedPoints}
            allocateStat={state.allocateStat}
            level={state.level}
            unlockedGear={state.unlockedGear}
          />
          <PartySystem />
        </div>
      </main>

      <footer className="app-footer">
        <p>QuestHabit — Progress saves on logout and tab close.</p>
      </footer>
    </div>
  );
}
