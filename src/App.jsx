import useGameState from './hooks/useGameState';
import Dashboard from './components/Dashboard';
import HabitList from './components/HabitList';
import BattleScene from './components/BattleScene';
import StatsPanel from './components/StatsPanel';
import PartySystem from './components/PartySystem';
import './App.css';

export default function App() {
  const state = useGameState();

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="logo">
          <span className="logo-icon">⚔️</span> QuestHabit
        </h1>
        <button className="reset-btn" onClick={state.resetDaily}>
          🌅 New Day
        </button>
      </header>

      <main className="layout">
        <div className="col-left">
          <Dashboard
            username={state.username}
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
        <p>QuestHabit MVP — All data is local. No backend required.</p>
      </footer>
    </div>
  );
}
