import { useState } from 'react';

const MOCK_MEMBERS = [
  { name: 'ShadowFox', avatar: '🦊', completed: true },
  { name: 'PixelKnight', avatar: '🤖', completed: false },
  { name: 'StarMage', avatar: '⭐', completed: true },
];

export default function PartySystem() {
  const [inParty, setInParty] = useState(false);

  const completedCount = MOCK_MEMBERS.filter(m => m.completed).length;

  if (!inParty) {
    return (
      <div className="card party-system">
        <h3 className="section-title">👥 Party</h3>
        <div className="party-empty">
          <p>Team up with friends to tackle quests together!</p>
          <button className="create-party-btn" onClick={() => setInParty(true)}>
            ⚔️ Create Party
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card party-system">
      <h3 className="section-title">👥 Party — Team Alpha</h3>

      <div className="shared-quest">
        <span className="quest-icon">📜</span>
        <div>
          <div className="quest-name">Shared Quest: Complete 1 habit today</div>
          <div className="quest-progress">{completedCount + 1}/{MOCK_MEMBERS.length + 1} members completed</div>
        </div>
      </div>

      <div className="party-members">
        <div className="member you">
          <span className="member-avatar">🧙</span>
          <span className="member-name">You</span>
          <span className="member-status done">✓</span>
        </div>
        {MOCK_MEMBERS.map(m => (
          <div key={m.name} className="member">
            <span className="member-avatar">{m.avatar}</span>
            <span className="member-name">{m.name}</span>
            <span className={`member-status ${m.completed ? 'done' : 'pending'}`}>
              {m.completed ? '✓' : '...'}
            </span>
          </div>
        ))}
      </div>

      <button className="leave-party-btn" onClick={() => setInParty(false)}>
        Leave Party
      </button>
    </div>
  );
}
