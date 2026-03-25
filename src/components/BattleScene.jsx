import ProgressBar from './ProgressBar';

export default function BattleScene({ combat, combatLog, bossDefeatedFlash, maxMana, dpsStats }) {
  const { stage, bossHp, bossMaxHp, bossName, bossEmoji, mana } = combat;
  const bossDefeated = bossHp <= 0;
  const hpPct = bossHp / bossMaxHp;

  return (
    <div className={`card battle-card ${bossDefeatedFlash ? 'boss-flash' : ''}`}>
      <div className="battle-header">
        <h3 className="section-title">⚔️ Battle Arena</h3>
        <span className="stage-badge">Stage {stage}</span>
      </div>

      <div className="battle-arena">
        <div className="battle-ground" />

        <div className="battle-hero idle-swing">
          <span className="battle-sprite hero-battle-sprite">🧙‍♂️</span>
        </div>

        <div className="battle-center">
          {combatLog.map(entry => (
            <span
              key={entry.id}
              className={`idle-damage ${entry.isCrit ? 'crit' : ''} ${entry.isMagic ? 'magic' : ''}`}
              style={{ '--offset-x': `${entry.offsetX}px` }}
            >
              {entry.damage}
            </span>
          ))}
        </div>

        <div className={`battle-boss ${bossDefeated ? 'defeated' : ''}`}>
          <span className="battle-sprite boss-battle-sprite">{bossEmoji}</span>
        </div>
      </div>

      <div className="boss-info">
        <div className="boss-info-header">
          <span className="boss-name">{bossEmoji} {bossName}</span>
          <span className="boss-hp-nums">{bossHp} / {bossMaxHp}</span>
        </div>
        <ProgressBar
          value={bossHp}
          max={bossMaxHp}
          color={hpPct < 0.25 ? '#ef4444' : hpPct < 0.5 ? '#f59e0b' : '#22c55e'}
          height={16}
        />
      </div>

      <div className="combat-stats-row">
        <div className="combat-stat">
          <span className="combat-stat-label">DPS</span>
          <span className="combat-stat-value">{dpsStats.totalDps}</span>
        </div>
        <div className="combat-stat">
          <span className="combat-stat-label">Phys</span>
          <span className="combat-stat-value phys">{dpsStats.physDmg}</span>
        </div>
        <div className="combat-stat">
          <span className="combat-stat-label">Magic</span>
          <span className="combat-stat-value magic">{dpsStats.magicDmg}</span>
        </div>
        <div className="combat-stat">
          <span className="combat-stat-label">Crit</span>
          <span className="combat-stat-value crit">{dpsStats.critChance}%</span>
        </div>
        <div className="combat-stat">
          <span className="combat-stat-label">Mana</span>
          <span className="combat-stat-value mana">{Math.round(mana)}/{maxMana}</span>
        </div>
      </div>
    </div>
  );
}
