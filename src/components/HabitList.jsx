import { useState } from 'react';
import { CATEGORIES } from '../hooks/useGameState';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DIFF_COLORS = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };

export default function HabitList({ habits, addHabit, completeHabit, deleteHabit }) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [category, setCategory] = useState('physical');
  const [xpPopup, setXpPopup] = useState(null);

  function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    addHabit(name.trim(), difficulty, category);
    setName('');
  }

  function handleComplete(habit) {
    const earned = completeHabit(habit.id);
    if (earned) {
      setXpPopup({ id: habit.id, amount: earned });
      setTimeout(() => setXpPopup(null), 1200);
    }
  }

  const selectedCat = CATEGORIES.find(c => c.id === category);

  return (
    <div className="card habit-list">
      <h3 className="section-title">⚔️ Personal quests</h3>

      <form className="habit-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="New quest..."
          value={name}
          onChange={e => setName(e.target.value)}
          className="habit-input"
          maxLength={50}
        />

        <div className="form-selectors">
          <div className="cat-select">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                className={`cat-btn ${category === c.id ? 'active' : ''}`}
                style={category === c.id ? { background: `${c.color}20`, borderColor: c.color, color: c.color } : {}}
                onClick={() => setCategory(c.id)}
                title={`${c.name} — ${c.desc}`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          <div className="diff-select">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                type="button"
                className={`diff-btn ${difficulty === d ? 'active' : ''}`}
                style={difficulty === d ? { background: DIFF_COLORS[d], borderColor: DIFF_COLORS[d] } : {}}
                onClick={() => setDifficulty(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="form-bottom">
          <span className="form-hint">
            {selectedCat?.icon} {selectedCat?.desc} &middot; +{DIFFICULTIES.indexOf(difficulty) === 0 ? 10 : difficulty === 'Medium' ? 25 : 50} XP
          </span>
          <button type="submit" className="add-btn" disabled={!name.trim()}>+ Add Quest</button>
        </div>
      </form>

      <div className="habits">
        {habits.length === 0 && (
          <p className="empty-state">No quests yet. Add your first habit above!</p>
        )}
        {habits.map(h => {
          const cat = CATEGORIES.find(c => c.id === h.category);
          return (
            <div key={h.id} className={`habit-item ${h.completedToday ? 'completed' : ''}`}>
              <button
                className={`check-btn ${h.completedToday ? 'checked' : ''}`}
                onClick={() => handleComplete(h)}
                disabled={h.completedToday}
                aria-label={h.completedToday ? 'Completed' : 'Mark complete'}
              >
                {h.completedToday ? '✓' : ''}
              </button>
              <div className="habit-info">
                <span className="habit-name">{h.name}</span>
                <div className="habit-meta">
                  <span className="cat-tag" style={{ color: cat?.color }}>
                    {cat?.icon} {cat?.name}
                  </span>
                  <span className="diff-tag" style={{ color: DIFF_COLORS[h.difficulty] }}>
                    {h.difficulty}
                  </span>
                  <span className="xp-tag">+{DIFFICULTIES.indexOf(h.difficulty) === 0 ? 10 : h.difficulty === 'Medium' ? 25 : 50} XP</span>
                  <span className="completions-tag">×{h.completedCount}</span>
                </div>
              </div>
              <button className="delete-btn" onClick={() => deleteHabit(h.id)} aria-label="Delete habit">
                ×
              </button>
              {xpPopup && xpPopup.id === h.id && (
                <span className="xp-popup">+{xpPopup.amount} XP</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
