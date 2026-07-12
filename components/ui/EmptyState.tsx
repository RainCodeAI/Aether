'use client';

import type { LucideIcon } from 'lucide-react';

// ─── Palette ──────────────────────────────────────────────────────────────────

type Color = 'cyan' | 'purple' | 'violet' | 'amber' | 'emerald' | 'rose' | 'orange' | 'slate';

const PALETTE: Record<Color, { bg: string; border: string; icon: string }> = {
  cyan:    { bg: 'from-cyan-500/15 to-cyan-500/5',       border: 'border-cyan-500/20',    icon: 'text-cyan-400'    },
  purple:  { bg: 'from-purple-500/15 to-purple-500/5',   border: 'border-purple-500/20',  icon: 'text-purple-400'  },
  violet:  { bg: 'from-violet-500/15 to-violet-500/5',   border: 'border-violet-500/20',  icon: 'text-violet-400'  },
  amber:   { bg: 'from-amber-500/15 to-amber-500/5',     border: 'border-amber-500/20',   icon: 'text-amber-400'   },
  emerald: { bg: 'from-emerald-500/15 to-emerald-500/5', border: 'border-emerald-500/20', icon: 'text-emerald-400' },
  rose:    { bg: 'from-rose-500/15 to-rose-500/5',       border: 'border-rose-500/20',    icon: 'text-rose-400'    },
  orange:  { bg: 'from-orange-500/15 to-orange-500/5',   border: 'border-orange-500/20',  icon: 'text-orange-400'  },
  slate:   { bg: 'from-slate-700/20 to-slate-800/10',    border: 'border-slate-600/25',   icon: 'text-slate-500'   },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmptyAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

interface EmptyStateProps {
  icon: LucideIcon;
  color?: Color;
  title: string;
  description: string;
  actions?: EmptyAction[];
  hint?: string;
  /** sm = inside a card, md = panel, lg = full-page hero */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmptyState({
  icon: Icon,
  color = 'slate',
  title,
  description,
  actions,
  hint,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const p = PALETTE[color];

  const iconPx   = size === 'lg' ? 32 : size === 'sm' ? 18 : 26;
  const wrapCls  = size === 'lg' ? 'w-[72px] h-[72px] rounded-[20px]' : size === 'sm' ? 'w-10 h-10 rounded-xl' : 'w-16 h-16 rounded-2xl';
  const padCls   = size === 'lg' ? 'py-20 px-8' : size === 'sm' ? 'py-8 px-4' : 'py-16 px-6';
  const titleCls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-xl';
  const descCls  = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={`flex flex-col items-center text-center aether-fade-up ${padCls} ${className}`}>

      {/* Icon container */}
      <div className={`${wrapCls} bg-gradient-to-br ${p.bg} border ${p.border} flex items-center justify-center mb-5 shrink-0`}>
        <Icon size={iconPx} className={p.icon} />
      </div>

      {/* Copy */}
      <h3 className={`font-semibold text-slate-200 mb-2 ${titleCls}`}>{title}</h3>
      <p className={`text-slate-500 leading-relaxed max-w-xs ${descCls}`}>{description}</p>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-3 mt-6 flex-wrap justify-center">
          {actions.map((action, i) => {
            const Ico = action.icon;
            const v   = action.variant ?? (i === 0 ? 'primary' : 'secondary');
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`flex items-center gap-2 rounded-2xl text-sm font-medium transition-all press-scale ${
                  v === 'primary'
                    ? 'px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black'
                    : v === 'ghost'
                    ? 'px-3 py-1.5 text-slate-500 hover:text-slate-300'
                    : 'px-5 py-2.5 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {Ico && <Ico size={15} />}
                {action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Hint */}
      {hint && (
        <p className="text-xs text-slate-700 mt-4 max-w-xs leading-relaxed">{hint}</p>
      )}
    </div>
  );
}
