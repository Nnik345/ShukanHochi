import { SKILLS } from '../hooks/useGameState';

const STAT_INFO = [
  { key: 'str', name: 'Strength', icon: '💪', color: '#ef4444', desc: 'Increases physical damage' },
  { key: 'int', name: 'Intelligence', icon: '🧠', color: '#818cf8', desc: 'Increases magic damage & mana' },
  { key: 'dex', name: 'Dexterity', icon: '🎨', color: '#22c55e', desc: 'Increases critical hit chance' },
];

export default function StatsPanel({ stats, unallocatedPoints, allocateStat, level, unlockedGear }) {
  return (
    <div className="card stats-panel">
      <div className="stats-header">
        <h3 className="section-title">📊 Hero Stats</h3>
        {unallocatedPoints > 0 && (
          <span className="points-badge">
            {unallocatedPoints} point{unallocatedPoints > 1 ? 's' : ''} available!
          </span>
        )}
      </div>

      <div className="stats-grid">
        {STAT_INFO.map(s => (
          <div key={s.key} className="stat-row">
            <div className="stat-icon-wrap" style={{ background: `${s.color}20`, color: s.color }}>
              <span>{s.icon}</span>
            </div>
            <div className="stat-info">
              <div className="stat-name-row">
                <span className="stat-name">{s.name}</span>
                <span className="stat-value" style={{ color: s.color }}>{stats[s.key]}</span>
              </div>
              <span className="stat-desc">{s.desc}</span>
            </div>
            {unallocatedPoints > 0 && (
              <button
                className="allocate-btn"
                style={{ borderColor: s.color, color: s.color }}
                onClick={() => allocateStat(s.key)}
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="gear-section">
        <h4 className="sub-title">🗡️ Gear</h4>
        <div className="gear-grid">
          {unlockedGear.map(g => (
            <div key={g.slot} className={`gear-slot ${g.unlocked ? 'unlocked' : 'locked'}`}>
              <div className="gear-icon">{g.unlocked ? getGearEmoji(g.slot) : '🔒'}</div>
              <span className="gear-name">{g.unlocked ? g.name : `LVL ${g.unlockLevel}`}</span>
              <span className="gear-slot-label">{g.slot}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="skills-section">
        <h4 className="sub-title">✨ Skills</h4>
        <div className="skills-grid">
          {SKILLS.map(skill => {
            const unlocked = level >= skill.level;
            return (
              <div key={skill.id} className={`skill-card ${unlocked ? 'unlocked' : 'locked'}`}>
                <span className="skill-icon">{skill.icon}</span>
                <div className="skill-info">
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-desc">
                    {unlocked ? skill.desc : `Unlocks at LVL ${skill.level}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getGearEmoji(slot) {
  const map = { 'Weapon': '🗡️', 'Shield': '🛡️', 'Head': '⛑️', 'Chest': '🦺', 'Weapon+': '🔥', 'Shield+': '💎' };
  return map[slot] || '⚙️';
}
