import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseDragPaintOptions<T = string> {
  /** Callback fired when an item should be painted with the target state */
  onPaintItem: (id: T, targetState: boolean) => void;
  /** Optional getter for current state of an item */
  getItemState?: (id: T) => boolean;
}

export function useDragPaint<T = string>({ onPaintItem, getItemState }: UseDragPaintOptions<T>) {
  const [isPainting, setIsPainting] = useState(false);
  const [targetState, setTargetState] = useState(true);
  const paintedIdsRef = useRef<Set<T>>(new Set());

  // Global cleanup when user releases mouse/pointer anywhere
  useEffect(() => {
    const handleGlobalStop = () => {
      setIsPainting(false);
      paintedIdsRef.current.clear();
      document.body.style.userSelect = '';
    };

    if (isPainting) {
      document.body.style.userSelect = 'none';
      window.addEventListener('mouseup', handleGlobalStop);
      window.addEventListener('pointerup', handleGlobalStop);
      window.addEventListener('pointercancel', handleGlobalStop);
      return () => {
        document.body.style.userSelect = '';
        window.removeEventListener('mouseup', handleGlobalStop);
        window.removeEventListener('pointerup', handleGlobalStop);
        window.removeEventListener('pointercancel', handleGlobalStop);
      };
    }
  }, [isPainting]);

  const startPaint = useCallback(
    (id: T, currentState?: boolean, e?: React.MouseEvent | React.PointerEvent) => {
      if (e) e.stopPropagation();
      const current = currentState !== undefined ? currentState : getItemState ? getItemState(id) : false;
      const nextState = !current;

      setTargetState(nextState);
      setIsPainting(true);
      paintedIdsRef.current.clear();
      paintedIdsRef.current.add(id);

      onPaintItem(id, nextState);
    },
    [getItemState, onPaintItem]
  );

  const paintItem = useCallback(
    (id: T) => {
      if (!isPainting || paintedIdsRef.current.has(id)) return;
      paintedIdsRef.current.add(id);
      onPaintItem(id, targetState);
    },
    [isPainting, onPaintItem, targetState]
  );

  /** Helper to spread onto React elements (e.g. table rows or checkboxes) */
  const getItemProps = useCallback(
    (id: T, currentState?: boolean) => ({
      onMouseDown: (e: React.MouseEvent) => startPaint(id, currentState, e),
      onMouseEnter: () => paintItem(id),
    }),
    [paintItem, startPaint]
  );

  return {
    isPainting,
    targetState,
    startPaint,
    paintItem,
    getItemProps,
  };
}
