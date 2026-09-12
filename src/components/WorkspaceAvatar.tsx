import React from 'react';

export interface WorkspaceAvatarProps {
  seed?: string | null;
  slug?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  showReroll?: boolean;
  onReroll?: () => void;
  square?: boolean;
  colors?: string[];
}

export const BAUHAUS_COLORS = [
  '#00686c',
  '#32c2b9',
  '#edecb3',
  '#fad928',
  '#ff9915',
];

const ELEMENTS = 4;
const SIZE = 80;

export const hashCode = (name: string): number => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const character = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + character;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const getDigit = (number: number, ntn: number): number => {
  return Math.floor((number / Math.pow(10, ntn)) % 10);
};

export const getBoolean = (number: number, ntn: number): boolean => {
  return !((getDigit(number, ntn)) % 2);
};

export const getRandomColor = (number: number, colors: string[], range: number): string => {
  return colors[number % range];
};

export const getUnit = (number: number, range: number, index?: number): number => {
  const value = number % range;
  if (index && ((getDigit(number, index) % 2) === 0)) {
    return -value;
  } else {
    return value;
  }
};

export function generateColors(name: string, colors: string[] = BAUHAUS_COLORS) {
  const numFromName = hashCode(name);
  const range = colors && colors.length;

  const elementsProperties = Array.from({ length: ELEMENTS }, (_, i) => ({
    color: getRandomColor(numFromName + i, colors, range),
    translateX: getUnit(numFromName * (i + 1), SIZE / 2 - (i + 17), 1),
    translateY: getUnit(numFromName * (i + 1), SIZE / 2 - (i + 17), 2),
    rotate: getUnit(numFromName * (i + 1), 360),
    isSquare: getBoolean(numFromName, 2),
  }));

  return elementsProperties;
}

export const AvatarBauhaus: React.FC<{
  name: string;
  colors?: string[];
  size?: number;
  square?: boolean;
  title?: boolean;
  className?: string;
}> = ({
  name,
  colors = BAUHAUS_COLORS,
  size = 80,
  square = false,
  title = false,
  className = '',
  ...otherProps
}) => {
  const properties = generateColors(name, colors);
  const maskID = React.useId();

  return (
    <svg
      viewBox={'0 0 ' + SIZE + ' ' + SIZE}
      fill="none"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
      {...otherProps}
    >
      {title && <title>{name}</title>}
      <mask id={maskID} maskUnits="userSpaceOnUse" x={0} y={0} width={SIZE} height={SIZE}>
        <rect width={SIZE} height={SIZE} rx={square ? undefined : SIZE * 2} fill="#FFFFFF" />
      </mask>
      <g mask={`url(#${maskID})`}>
        <rect width={SIZE} height={SIZE} fill={properties[0].color} />
        <rect
          x={(SIZE - 60) / 2}
          y={(SIZE - 20) / 2}
          width={SIZE}
          height={properties[1].isSquare ? SIZE : SIZE / 8}
          fill={properties[1].color}
          transform={
            'translate(' +
            properties[1].translateX +
            ' ' +
            properties[1].translateY +
            ') rotate(' +
            properties[1].rotate +
            ' ' +
            SIZE / 2 +
            ' ' +
            SIZE / 2 +
            ')'
          }
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          fill={properties[2].color}
          r={SIZE / 5}
          transform={'translate(' + properties[2].translateX + ' ' + properties[2].translateY + ')'}
        />
        <line
          x1={0}
          y1={SIZE / 2}
          x2={SIZE}
          y2={SIZE / 2}
          strokeWidth={2}
          stroke={properties[3].color}
          transform={
            'translate(' +
            properties[3].translateX +
            ' ' +
            properties[3].translateY +
            ') rotate(' +
            properties[3].rotate +
            ' ' +
            SIZE / 2 +
            ' ' +
            SIZE / 2 +
            ')'
          }
        />
      </g>
    </svg>
  );
};

export const WorkspaceAvatar: React.FC<WorkspaceAvatarProps> = ({
  seed,
  slug,
  name,
  size = 32,
  className = '',
  showReroll = false,
  onReroll,
  square = false,
  colors = BAUHAUS_COLORS,
}) => {
  const effectiveSeed = seed || slug || name || 'default-workspace';

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative shrink-0 inline-flex items-center justify-center overflow-hidden ${
        square ? 'rounded-lg' : 'rounded-full'
      } ${className}`}
    >
      <AvatarBauhaus
        name={effectiveSeed}
        colors={colors}
        size={size}
        square={square}
      />

      {showReroll && onReroll && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReroll();
          }}
          className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white hover:bg-stone-100 border border-stone-300 text-stone-600 flex items-center justify-center shadow-2xs cursor-pointer transition-all active:scale-90 z-10"
          title="Reroll avatar"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default WorkspaceAvatar;
