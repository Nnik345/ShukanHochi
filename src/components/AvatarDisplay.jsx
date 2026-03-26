import { getAvatarEmoji, normalizeAvatarId } from '../constants/avatarOptions';

export default function AvatarDisplay({ avatarId, size = 56, className = '' }) {
  const id = normalizeAvatarId(avatarId);
  const emoji = getAvatarEmoji(id);
  const px = typeof size === 'number' ? `${size}px` : size;
  const fontSize = `calc(${typeof size === 'number' ? size : 56}px * 0.55)`;

  return (
    <span
      className={`avatar-display avatar-display--emoji ${className}`}
      style={{ width: px, height: px, fontSize }}
      role="img"
      aria-hidden
    >
      {emoji}
    </span>
  );
}
