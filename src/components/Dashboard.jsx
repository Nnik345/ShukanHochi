import ProgressBar from './ProgressBar';
import AvatarDisplay from './AvatarDisplay';
import { PREMADE_AVATARS, normalizeAvatarId } from '../constants/avatarOptions';

export default function Dashboard({
  username,
  level,
  xp,
  xpToNext,
  streak,
  tier,
  unallocatedPoints,
  avatarId,
  onAvatarSelect,
}) {
  return (
    <div className="card dashboard">
      <div className="dashboard-header">
        <div className="avatar-section">
          <div className="avatar-wrap">
            <AvatarDisplay avatarId={avatarId} size={56} className="avatar-ring" />
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

      <div className="avatar-picker-block">
        <span className="avatar-picker-label">Avatar</span>
        <div className="avatar-picker-grid" role="list">
          {PREMADE_AVATARS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="listitem"
              className={`avatar-picker-cell ${opt.id === normalizeAvatarId(avatarId) ? 'is-selected' : ''}`}
              onClick={() => onAvatarSelect?.(opt.id)}
              title={opt.label}
              aria-label={opt.label}
              aria-pressed={opt.id === normalizeAvatarId(avatarId)}
            >
              <span className="avatar-picker-emoji">{opt.emoji}</span>
            </button>
          ))}
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
