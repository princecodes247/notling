import React from 'react';
import { Avatar } from '@avatune/react';
import pacovqzzTheme from '@avatune/pacovqzz-theme/react';

interface UserAvatarProps {
  avatarUrl?: string | null;
  seed?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  seed,
  name,
  email,
  size = 32,
  className = '',
}) => {
  // Determine effective seed or image URL
  const rawTarget = avatarUrl || seed || '';

  const isHttpUrl = rawTarget.startsWith('http://') || rawTarget.startsWith('https://') || rawTarget.startsWith('data:');

  if (isHttpUrl) {
    return (
      <img
        src={rawTarget}
        alt={name || email || 'User Avatar'}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  // Extract clean seed string (strip 'avatune:' prefix if present)
  let effectiveSeed = rawTarget.replace(/^avatune:/, '').trim();
  if (!effectiveSeed) {
    effectiveSeed = (email || name || 'user-default').trim().toLowerCase();
  }

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`rounded-full overflow-hidden shrink-0 inline-flex items-center justify-center bg-stone-100 border border-stone-200/80 ${className}`}
    >
      <Avatar theme={pacovqzzTheme} seed={effectiveSeed} size={size} />
    </div>
  );
};
