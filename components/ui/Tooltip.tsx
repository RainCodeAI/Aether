// components/ui/Tooltip.tsx
'use client';

/**
 * Aether Tooltip — premium dark-glass tooltip system.
 *
 * Design goals:
 *  • Portal-based (position:fixed) so it escapes every overflow:hidden container
 *  • Auto-flip: detects viewport edges and flips to the opposite side automatically
 *  • Direction-aware slide animation via CSS custom properties (--tt-dx / --tt-dy)
 *  • 150 ms hover delay by default — responsive but not jittery
 *  • Long-press (600 ms) on mobile with auto-dismiss after 1800 ms
 *  • `disabled` prop suppresses the tooltip without changing the wrapper layout
 *  • `TipKbd` named export for consistent keyboard-hint rendering
 */

import React, {
  useState, useRef, useCallback, ReactNode, useEffect,
} from 'react';
import { createPortal } from 'react-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  /** Tooltip body — ReactNode, or null/undefined to render nothing. */
  content:    ReactNode;
  position?:  TooltipSide;
  children:   ReactNode;
  /**
   * Hover-show delay in ms.
   * Default: 150.  Use 400-600 for drag handles / infrequent targets.
   */
  delay?:     number;
  /**
   * Applied to the outer wrapper div.
   * Pass `hidden sm:inline-flex` to match a child button's responsive hiding.
   */
  className?: string;
  /**
   * When true the tooltip is suppressed entirely (event handlers are a no-op).
   * The children still render inside the same-sized wrapper.
   */
  disabled?:  boolean;
}

// ─── Keyboard-hint helper ─────────────────────────────────────────────────────

/**
 * Renders a keyboard shortcut hint inside a tooltip.
 *
 * Usage:
 *   <Tooltip content={<>Open settings <TipKbd>⌘,</TipKbd></>}>
 */
export function TipKbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="ml-1 inline-block px-[5px] py-px bg-white/6 rounded text-[9px] font-mono not-italic border border-white/10 text-slate-400 leading-tight">
      {children}
    </kbd>
  );
}

// ─── Placement math ───────────────────────────────────────────────────────────

const FLIP: Record<TooltipSide, TooltipSide> = {
  top: 'bottom', bottom: 'top', left: 'right', right: 'left',
};

/** Gap between trigger edge and tooltip bubble (px). */
const GAP = 9;
/** Max tooltip width used for placement math (must match maxWidth in bubble style). */
const MAX_W = 240;
/** Estimated tooltip height for flip decisions. Actual may vary; clamping handles it. */
const EST_H = 52;

interface Placed { top: number; left: number; side: TooltipSide }

function computePlacement(rect: DOMRect, preferred: TooltipSide): Placed {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Check room on each side
  const room: Record<TooltipSide, boolean> = {
    top:    rect.top          >= EST_H + GAP + 10,
    bottom: vh - rect.bottom  >= EST_H + GAP + 10,
    left:   rect.left         >= MAX_W + GAP + 10,
    right:  vw - rect.right   >= MAX_W + GAP + 10,
  };

  // Use preferred if there's room; otherwise try the opposite side
  let side: TooltipSide = preferred;
  if (!room[side] && room[FLIP[side]]) side = FLIP[side];

  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;

  let top: number, left: number;

  switch (side) {
    case 'top':
      top  = rect.top  - GAP - EST_H;
      left = cx - MAX_W / 2;
      break;
    case 'bottom':
      top  = rect.bottom + GAP;
      left = cx - MAX_W / 2;
      break;
    case 'left':
      top  = cy - EST_H / 2;
      left = rect.left - GAP - MAX_W;
      break;
    case 'right':
      top  = cy - EST_H / 2;
      left = rect.right + GAP;
      break;
    default:
      top = 0; left = 0;
  }

  // Clamp to viewport with a 6 px margin on every side
  left = Math.max(6, Math.min(left, vw - MAX_W - 6));
  top  = Math.max(6, Math.min(top,  vh - EST_H - 6));

  return { top, left, side };
}

/**
 * Per-side animation offsets.
 * The tooltip starts *near the trigger* and slides *away* from it, creating a
 * natural "emerging from the button" feel.
 *
 *  top    → starts slightly below final position, slides UP
 *  bottom → starts slightly above final position, slides DOWN
 *  left   → starts slightly right of final position, slides LEFT
 *  right  → starts slightly left of final position, slides RIGHT
 */
const SLIDE: Record<TooltipSide, { dx: string; dy: string }> = {
  top:    { dx: '0px',  dy: '5px'  },
  bottom: { dx: '0px',  dy: '-5px' },
  left:   { dx: '5px',  dy: '0px'  },
  right:  { dx: '-5px', dy: '0px'  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Tooltip({
  content,
  position  = 'top',
  children,
  delay     = 150,
  className = '',
  disabled  = false,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [placed,  setPlaced]  = useState<Placed | null>(null);
  const [mounted, setMounted] = useState(false);   // SSR / portal safety

  const wrapperRef  = useRef<HTMLDivElement>(null);
  const showTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only mount the portal after client-side hydration
  useEffect(() => { setMounted(true); }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (showTimer.current)  clearTimeout(showTimer.current);
    if (touchTimer.current) clearTimeout(touchTimer.current);
    if (hideTimer.current)  clearTimeout(hideTimer.current);
  }, []);

  const show = useCallback(() => {
    if (disabled || !content) return;
    if (hideTimer.current)  clearTimeout(hideTimer.current);
    if (showTimer.current)  clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => {
      if (wrapperRef.current) {
        setPlaced(computePlacement(wrapperRef.current.getBoundingClientRect(), position));
      }
      setVisible(true);
    }, delay);
  }, [disabled, content, position, delay]);

  const hide = useCallback(() => {
    if (showTimer.current)  clearTimeout(showTimer.current);
    if (touchTimer.current) clearTimeout(touchTimer.current);
    setVisible(false);
    setPlaced(null);
  }, []);

  const onTouchStart = useCallback(() => {
    if (disabled || !content) return;
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => {
      if (wrapperRef.current) {
        setPlaced(computePlacement(wrapperRef.current.getBoundingClientRect(), position));
      }
      setVisible(true);
    }, 600);
  }, [disabled, content, position]);

  const onTouchEnd = useCallback(() => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setPlaced(null);
    }, 1800);
  }, []);

  // Always render the same wrapper so className (e.g. `hidden sm:inline-flex`) applies
  // whether or not content / disabled changes.
  return (
    <div
      ref={wrapperRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {children}

      {visible && placed && mounted && createPortal(
        <div
          role="tooltip"
          aria-live="polite"
          className="fixed pointer-events-none"
          style={{ top: placed.top, left: placed.left, maxWidth: MAX_W, zIndex: 9000 }}
        >
          <div
            className="aether-tooltip rounded-xl px-3 py-2 text-xs text-slate-200 whitespace-normal leading-relaxed"
            style={{
              background:           'rgba(5, 8, 20, 0.97)',
              border:               '1px solid rgba(34, 211, 238, 0.17)',
              backdropFilter:       'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow:            '0 0 0 1px rgba(34,211,238,0.04), 0 16px 48px rgba(0,0,0,0.72), 0 4px 16px rgba(0,0,0,0.45)',
              // These CSS custom properties feed the directional slide animation
              ['--tt-dx' as string]: SLIDE[placed.side].dx,
              ['--tt-dy' as string]: SLIDE[placed.side].dy,
            }}
          >
            {content}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
