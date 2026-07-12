// components/layout/CommandBar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, Keyboard, Command } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { generateAutoInsights } from '@/lib/ai-search';
import WorkspaceSwitcher from '@/components/collaboration/WorkspaceSwitcher';
import { UserButton } from '@clerk/nextjs';
import { useSafeUser } from '@/lib/hooks/useSafeUser';
import Tooltip, { TipKbd } from '@/components/ui/Tooltip';

// ── Placeholder examples ───────────────────────────────────────────────────────

const PLACEHOLDERS = [
  'Ask anything…',
  'e.g. Show projects in Ontario',
  'Risk analysis on Q3 Launch?',
  'Find connections to Stratford Tech Hub',
  'Revenue summary this month',
  'Upcoming deadlines?',
  'Who leads Project Atlas?',
];

const CYCLE_MS = 8_000;

// ── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] tabular-nums select-none">
      <span className={`font-semibold font-mono leading-none ${color}`}>{count}</span>
      <span className="text-slate-600 leading-none">{label}</span>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface CommandBarProps {
  onOpenSidebar:   () => void;
  onReset:         () => void;
  onOpenShortcuts: () => void;
  onOpenPalette?:  () => void;
}

export default function CommandBar({
  onOpenSidebar, onReset, onOpenShortcuts, onOpenPalette,
}: CommandBarProps) {
  const { searchQuery, setSearchQuery, setAIAnalystOpen, data } = useAetherStore();
  const { user } = useSafeUser();

  const searchInputRef = useRef<HTMLInputElement>(null);

  const clerkKey   = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
  const clerkReady = /^pk_(test|live)_/.test(clerkKey) && clerkKey.length > 40;

  // ── Greeting (refreshes every minute so hour boundary is caught) ────────────
  const [greetingPart, setGreetingPart] = useState('');
  const [nameLabel,    setNameLabel]    = useState('');

  useEffect(() => {
    const refresh = () => {
      const h    = new Date().getHours();
      const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
      const name = user?.firstName
        ?? user?.emailAddresses?.[0]?.emailAddress?.split('@')[0]
        ?? 'there';
      setGreetingPart(`Good ${part},`);
      setNameLabel(name);
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [user]);

  // ── Placeholder cycling (pauses while focused or query is non-empty) ────────
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isFocused,      setIsFocused]      = useState(false);

  useEffect(() => {
    if (isFocused || searchQuery) return;
    const id = setInterval(
      () => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length),
      CYCLE_MS,
    );
    return () => clearInterval(id);
  }, [isFocused, searchQuery]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const entityCount        = data.nodes.length;
  const activeProjectCount = data.nodes.filter(
    n => n.type === 'Project' && n.properties.status === 'Active',
  ).length;
  const signalCount = generateAutoInsights(data).length;
  const hasStats    = entityCount > 0;

  return (
    <div className="h-14 sm:h-16 border-b border-slate-800 bg-[#0A0A0C]/80 backdrop-blur-md flex items-center gap-2 sm:gap-3 lg:gap-4 px-3 sm:px-6 lg:px-8 z-10 shrink-0">

      {/* ── Hamburger (mobile only) ── */}
      <button
        onClick={onOpenSidebar}
        aria-label="Open navigation"
        className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white shrink-0 touch-target"
      >
        <Menu size={20} />
      </button>

      {/* ── Greeting ── */}
      {greetingPart && (
        <div className="hidden md:flex items-baseline gap-1.5 shrink-0">
          <span className="text-sm text-slate-500 leading-none">{greetingPart}</span>
          <button
            onClick={() => { /* TODO: open profile / settings panel */ }}
            title="Profile & settings"
            className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors duration-150 leading-none"
          >
            {nameLabel}
          </button>
        </div>
      )}

      {/* Divider between greeting and search */}
      {greetingPart && <div className="hidden md:block w-px h-4 bg-slate-800 shrink-0" />}

      {/* ── Search ── */}
      <div className="flex-1 min-w-0 relative">

        {/* Focus glow ring — sits behind the input */}
        <div
          className={`absolute -inset-0.5 rounded-xl sm:rounded-2xl pointer-events-none transition-all duration-300 ${
            isFocused
              ? 'shadow-[0_0_0_1.5px_rgba(6,182,212,0.45),0_0_24px_rgba(6,182,212,0.10)]'
              : 'shadow-none'
          }`}
        />

        {/* Search icon */}
        <Search
          className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 transition-colors duration-200 pointer-events-none ${
            isFocused ? 'text-cyan-400' : 'text-slate-500'
          }`}
          size={15}
        />

        {/* Input — placeholder attr is empty; the animated overlay below handles it visually */}
        <input
          ref={searchInputRef}
          type="text"
          aria-label="Search or ask anything"
          placeholder=""
          value={searchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && searchQuery.trim()) setAIAnalystOpen(true);
            if (e.key === 'Escape') { e.currentTarget.blur(); setSearchQuery(''); }
          }}
          className="relative w-full bg-slate-900/80 border border-slate-700/80 pl-9 sm:pl-11 pr-12 sm:pr-16 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-sm focus:outline-none focus:border-cyan-500/50 transition-colors duration-200"
        />

        {/* Animated cycling placeholder — unmounts on focus/value so animation re-fires on each change */}
        {!searchQuery && !isFocused && (
          <div
            key={placeholderIdx}
            aria-hidden
            className="absolute left-9 sm:left-11 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none select-none truncate max-w-[60%] sm:max-w-[68%] aether-fade-up"
            style={{ animationDuration: '400ms', animationFillMode: 'both' }}
          >
            {PLACEHOLDERS[placeholderIdx]}
          </div>
        )}

        {/* ⏎ when typing · ⌘K opens palette when idle */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex">
          {searchQuery.trim() ? (
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-500 font-mono pointer-events-none">
              ⏎
            </kbd>
          ) : (
            <button
              type="button"
              onClick={() => onOpenPalette?.()}
              title="Open command palette"
              className={`px-1.5 py-0.5 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded text-[10px] text-slate-500 hover:text-slate-300 font-mono flex items-center gap-0.5 transition-all duration-200 ${
                isFocused ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              ⌘K
            </button>
          )}
        </div>
      </div>

      {/* ── Quick stats pills (xl+ · only when data exists) ── */}
      {hasStats && (
        <>
          <div className="hidden xl:block w-px h-4 bg-slate-800 shrink-0" />
          <div className="hidden xl:flex items-center gap-1.5 shrink-0">
            <StatPill count={entityCount}        label="entities" color="text-cyan-400"    />
            {activeProjectCount > 0 && (
              <StatPill count={activeProjectCount} label="active"   color="text-emerald-400" />
            )}
            {signalCount > 0 && (
              <StatPill count={signalCount}        label="signals"  color="text-violet-400"  />
            )}
          </div>
        </>
      )}

      {/* ── Right cluster ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="hidden lg:flex">
          <WorkspaceSwitcher />
        </div>

        <Tooltip content="Notifications" position="bottom">
          <button
            aria-label="Notifications"
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors touch-target text-slate-400 hover:text-white"
          >
            <Bell size={17} />
          </button>
        </Tooltip>

        <Tooltip content={<>Command palette <TipKbd>⌘K</TipKbd></>} position="bottom" className="hidden sm:inline-flex">
          <button
            onClick={() => onOpenPalette?.()}
            aria-label="Open command palette (⌘K)"
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-cyan-300"
          >
            <Command size={15} />
          </button>
        </Tooltip>

        <Tooltip content={<>Keyboard shortcuts <TipKbd>?</TipKbd></>} position="bottom" className="hidden sm:inline-flex">
          <button
            onClick={onOpenShortcuts}
            aria-label="Keyboard shortcuts (?)"
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-slate-300"
          >
            <Keyboard size={15} />
          </button>
        </Tooltip>

        <Tooltip content="Reset all data to defaults" position="bottom" className="hidden sm:inline-flex">
          <button
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1.5 transition-colors"
          >
            Reset
          </button>
        </Tooltip>

        {clerkReady ? (
          <UserButton />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-full flex items-center justify-center text-black font-semibold cursor-pointer select-none text-xs">
            ?
          </div>
        )}
      </div>
    </div>
  );
}
