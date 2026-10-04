import { flushSync } from 'react-dom';

/**
 * Executes a circular ripple View Transition from a click origin.
 * Automatically falls back to synchronous execution if View Transitions API
 * is not supported or if the user prefers reduced motion.
 */
export async function executeThemeTransition(
  applyChange: () => void,
  origin?: { x: number; y: number }
) {
  if (typeof document === 'undefined') {
    applyChange();
    return;
  }

  const startViewTransition = (document as any).startViewTransition?.bind(document);
  if (!startViewTransition || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
    applyChange();
    return;
  }

  const transition = startViewTransition(() => {
    flushSync(() => {
      applyChange();
    });
  });

  if (transition?.ready) {
    try {
      await transition.ready;
    } catch {
      // Transition was skipped or aborted
    }
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const maxDistance = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const clipPath = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${maxDistance}px at ${x}px ${y}px)`,
  ];

  try {
    document.documentElement.animate(
      {
        clipPath,
      },
      {
        duration: 500,
        easing: 'ease-in-out',
        fill: 'forwards',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  } catch {
    // Graceful fallback if pseudo-element animation is not permitted
  }
}
