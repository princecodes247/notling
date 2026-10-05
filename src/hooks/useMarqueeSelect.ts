import { useState, useEffect, useRef, useCallback } from 'react';

export interface MarqueeBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface UseMarqueeSelectOptions {
  /** CSS selector for selectable items */
  itemSelector: string;
  /** Function to extract ID from matched DOM element. Defaults to reading data-id, data-row-id, or data-block-id */
  getItemId?: (el: HTMLElement) => string | null;
  /** Callback fired whenever selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Callback fired on selection finish (pointer/mouse up) */
  onSelectionEnd?: (selectedIds: string[]) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
  /** Minimum pixel drag distance before marquee activates (default: 4) */
  dragThreshold?: number;
  /** Optional container ref if items should be queried inside a specific container element */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Ignore drag start if clicked on elements matching this selector (e.g. inputs, buttons, dropdowns) */
  ignoreSelector?: string;
  /** Selector for editable text elements where standard text highlighting should take priority */
  textSelector?: string;
  /** Whether to attach pointerdown globally on window to allow drag start from anywhere */
  globalPointerDown?: boolean;
}

export function useMarqueeSelect({
  itemSelector,
  getItemId = (el) =>
    el.getAttribute('data-id') ||
    el.getAttribute('data-row-id') ||
    el.getAttribute('data-block-id') ||
    el.querySelector('[data-id]')?.getAttribute('data-id') ||
    el.closest('[data-id]')?.getAttribute('data-id') ||
    null,
  onSelectionChange,
  onSelectionEnd,
  disabled = false,
  dragThreshold = 4,
  containerRef,
  ignoreSelector = 'input, textarea, button, select, a[href], .bn-side-menu, .bn-drag-handle, .mantine-Menu-dropdown, [role="menu"], [role="menuitem"], [role="dialog"], [data-prevent-marquee]',
  textSelector,
  globalPointerDown = false,
}: UseMarqueeSelectOptions) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [marqueeBox, setMarqueeBox] = useState<MarqueeBox | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isPointerDownRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentSelectedIdsRef = useRef<Set<string>>(new Set());
  const additiveRef = useRef(false);
  const initialSelectedIdsRef = useRef<string[]>([]);

  // Update refs for callbacks
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;
  const onSelectionEndRef = useRef(onSelectionEnd);
  onSelectionEndRef.current = onSelectionEnd;

  const calculateIntersections = useCallback(
    (box: MarqueeBox, isAdditive: boolean, initialIds: string[]) => {
      const root = containerRef?.current || document;
      const elements = Array.from(root.querySelectorAll(itemSelector)) as HTMLElement[];
      const newSelected = new Set<string>(isAdditive ? initialIds : []);

      const marqueeRect = {
        left: box.left,
        top: box.top,
        right: box.left + box.width,
        bottom: box.top + box.height,
      };

      for (const el of elements) {
        const id = getItemId(el);
        if (!id) continue;

        const rect = el.getBoundingClientRect();
        // Skip invisible elements
        if (rect.width === 0 && rect.height === 0) continue;

        // Check AABB intersection
        const intersects = !(
          rect.right < marqueeRect.left ||
          rect.left > marqueeRect.right ||
          rect.bottom < marqueeRect.top ||
          rect.top > marqueeRect.bottom
        );

        if (intersects) {
          newSelected.add(id);
        }
      }

      const idArray = Array.from(newSelected);
      currentSelectedIdsRef.current = newSelected;
      setSelectedIds(idArray);
      onSelectionChangeRef.current?.(idArray);
    },
    [containerRef, getItemId, itemSelector]
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent | MouseEvent | React.PointerEvent | React.MouseEvent) => {
      if (disabled) return;
      if (e.button !== 0) return; // Only primary mouse button

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore interactive controls
      if (ignoreSelector && target.closest(ignoreSelector)) {
        return;
      }

      // If clicked directly inside editable text content without modifiers, let native text highlight work
      const isModifier = e.shiftKey || e.metaKey || e.ctrlKey;
      if (textSelector && target.closest(textSelector) && !isModifier) {
        return;
      }

      isPointerDownRef.current = true;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      additiveRef.current = isModifier;
      initialSelectedIdsRef.current = isModifier ? Array.from(currentSelectedIdsRef.current) : [];
    },
    [disabled, ignoreSelector, textSelector]
  );

  useEffect(() => {
    if (disabled) return;

    const handleGlobalDown = (e: PointerEvent) => {
      if (globalPointerDown) {
        handlePointerDown(e);
      }
    };

    const handleGlobalPointerMove = (e: PointerEvent | MouseEvent) => {
      if (!isPointerDownRef.current || !startPosRef.current) return;

      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (!isSelecting && distance >= dragThreshold) {
        setIsSelecting(true);
        // Clear any text selection that might have started during drag initiation
        window.getSelection()?.removeAllRanges();
        document.body.style.userSelect = 'none';
        document.body.classList.add('bn-marquee-selecting');
      }

      if (isSelecting || distance >= dragThreshold) {
        const left = Math.min(startPosRef.current.x, e.clientX);
        const top = Math.min(startPosRef.current.y, e.clientY);
        const width = Math.abs(e.clientX - startPosRef.current.x);
        const height = Math.abs(e.clientY - startPosRef.current.y);

        const box: MarqueeBox = { left, top, width, height };
        setMarqueeBox(box);
        calculateIntersections(box, additiveRef.current, initialSelectedIdsRef.current);
      }
    };

    const handleGlobalPointerUp = () => {
      if (isPointerDownRef.current) {
        isPointerDownRef.current = false;
        startPosRef.current = null;

        if (isSelecting) {
          setIsSelecting(false);
          setMarqueeBox(null);
          document.body.style.userSelect = '';
          document.body.classList.remove('bn-marquee-selecting');
          onSelectionEndRef.current?.(Array.from(currentSelectedIdsRef.current));
        }
      }
    };

    if (globalPointerDown) {
      window.addEventListener('pointerdown', handleGlobalDown, { passive: true });
    }
    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      if (globalPointerDown) {
        window.removeEventListener('pointerdown', handleGlobalDown);
      }
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [calculateIntersections, disabled, dragThreshold, globalPointerDown, handlePointerDown, isSelecting]);

  const clearSelection = useCallback(() => {
    currentSelectedIdsRef.current.clear();
    setSelectedIds([]);
    onSelectionChangeRef.current?.([]);
    onSelectionEndRef.current?.([]);
  }, []);

  const setManualSelection = useCallback((ids: string[]) => {
    currentSelectedIdsRef.current = new Set(ids);
    setSelectedIds(ids);
  }, []);

  return {
    isSelecting,
    marqueeBox,
    selectedIds,
    handlePointerDown,
    clearSelection,
    setManualSelection,
  };
}

