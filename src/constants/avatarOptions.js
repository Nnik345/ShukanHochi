/**
 * Premade profile avatars (emoji). Stored in Mongo as `avatarId` (string key).
 * Keep in sync with backend `users.avatarId` and party API projections.
 */
export const PREMADE_AVATARS = [
  { id: 'wizard', emoji: '🧙', label: 'Wizard' },
  { id: 'knight', emoji: '🛡️', label: 'Knight' },
  { id: 'rogue', emoji: '🗡️', label: 'Rogue' },
  { id: 'cleric', emoji: '✨', label: 'Cleric' },
  { id: 'ranger', emoji: '🏹', label: 'Ranger' },
  { id: 'bard', emoji: '🎵', label: 'Bard' },
  { id: 'monk', emoji: '🥋', label: 'Monk' },
  { id: 'druid', emoji: '🌿', label: 'Druid' },
  { id: 'paladin', emoji: '⚔️', label: 'Paladin' },
  { id: 'necro', emoji: '💀', label: 'Necromancer' },
  { id: 'dragon', emoji: '🐉', label: 'Dragon' },
  { id: 'star', emoji: '⭐', label: 'Star' },
];

const BY_ID = new Map(PREMADE_AVATARS.map((a) => [a.id, a]));

export const DEFAULT_AVATAR_ID = 'wizard';

export function normalizeAvatarId(id) {
  if (typeof id !== 'string' || !id.trim()) return DEFAULT_AVATAR_ID;
  const t = id.trim();
  return BY_ID.has(t) ? t : DEFAULT_AVATAR_ID;
}

export function getAvatarEmoji(avatarId) {
  return BY_ID.get(normalizeAvatarId(avatarId))?.emoji ?? BY_ID.get(DEFAULT_AVATAR_ID).emoji;
}
