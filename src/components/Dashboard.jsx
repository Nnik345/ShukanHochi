import ProgressBar from './ProgressBar';

export default function Dashboard({ username, level, xp, xpToNext, streak, tier, unallocatedPoints }) {
  return (
    <div className="card dashboard">
      <div className="dashboard-header">
        <div className="avatar-section">
          <div className="avatar">
            <span className="avatar-icon">🧙</span>
          </div>
          <div className="user-info">
            <h2 className="username">{username}</h2>
            <span className="tier-badge" style={{ background: tier.color }}>
              {tier.icon} {tier.name}
            </span>
          </div>
        </div>
        <div className="streak-display">
          <span className="streak-flame">🔥</span>
          <div>
            <div className="streak-count">{streak}</div>
            <div className="streak-label">day streak</div>
          </div>
        </div>
      </div>

      <div className="level-section">
        <div className="level-header">
          <span className="level-badge">LVL {level}</span>
          <span className="xp-text">{xp} / {xpToNext} XP</span>
        </div>
        <ProgressBar value={xp} max={xpToNext} color="var(--accent)" />
        {unallocatedPoints > 0 && (
          <div className="levelup-alert">
            🎉 {unallocatedPoints} stat point{unallocatedPoints > 1 ? 's' : ''} to allocate!
          </div>
        )}
      </div>
    </div>
  );
}
