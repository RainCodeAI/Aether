'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, Users, X } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import { useSafeUser } from '@/lib/hooks/useSafeUser';

export default function WorkspaceSwitcher() {
  const {
    workspaces,
    currentWorkspaceId,
    createWorkspace,
    switchWorkspace,
    deleteWorkspace,
    addMemberToCurrentWorkspace,
    workspaceData,
    data,
  } = useAetherStore();

  const { user } = useSafeUser();
  const [open, setOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showNewWs, setShowNewWs] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [newWsName, setNewWsName] = useState('');
  const [inviteDone, setInviteDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  const entityCount = (wsId: string) => {
    if (wsId === currentWorkspaceId) return data.nodes.length;
    return workspaceData[wsId]?.nodes.length ?? 0;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowInvite(false);
        setShowNewWs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreateWorkspace = () => {
    if (!newWsName.trim()) return;
    createWorkspace(newWsName.trim());
    setNewWsName('');
    setShowNewWs(false);
    setOpen(false);
  };

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email || !email.includes('@')) return;
    addMemberToCurrentWorkspace(email);
    setInviteEmail('');
    setInviteDone(true);
    setTimeout(() => setInviteDone(false), 2000);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); setShowInvite(false); setShowNewWs(false); }}
        aria-label="Switch workspace"
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl text-sm transition-all"
      >
        <div className="w-4 h-4 rounded bg-gradient-to-br from-cyan-500/30 to-emerald-500/30 flex items-center justify-center shrink-0 border border-cyan-500/20">
          <span className="text-[8px] font-bold text-cyan-300 leading-none">
            {(current?.name ?? 'P')[0].toUpperCase()}
          </span>
        </div>
        <span className="text-slate-300 font-medium max-w-[110px] truncate text-xs">
          {current?.name ?? 'Personal'}
        </span>
        <ChevronDown
          size={12}
          className={`text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-68 bg-[#0B1120] border border-slate-700/60 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ width: '272px' }}
        >
          {/* Workspace list */}
          <div className="p-2">
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold tracking-[0.12em] text-slate-600 uppercase select-none">
              Workspaces
            </p>
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={`group flex items-center gap-1 rounded-xl transition-all ${
                  ws.id === currentWorkspaceId
                    ? 'bg-cyan-500/10 text-cyan-300'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => { switchWorkspace(ws.id); setOpen(false); }}
                  className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left min-w-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/15 to-emerald-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-cyan-400 leading-none">
                      {ws.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ws.name}</p>
                    <p className="text-[10px] text-slate-600 truncate">
                      {entityCount(ws.id)} entit{entityCount(ws.id) === 1 ? 'y' : 'ies'}
                      {ws.members.length > 0
                        ? ` · ${ws.members.length} member${ws.members.length !== 1 ? 's' : ''}`
                        : ' · Private'}
                    </p>
                  </div>
                  {ws.id === currentWorkspaceId && (
                    <Check size={13} className="text-cyan-400 shrink-0" />
                  )}
                </button>
                {workspaces.length > 1 && (
                  <button
                    type="button"
                    title="Delete workspace"
                    onClick={() => {
                      if (confirm(`Delete workspace “${ws.name}”? Its graph data will be removed.`)) {
                        deleteWorkspace(ws.id);
                      }
                    }}
                    className="mr-2 p-1.5 rounded-lg text-slate-700 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* New workspace form or button */}
          <div className="border-t border-slate-800/80 p-2 space-y-0.5">
            {showNewWs ? (
              <div className="px-2 pb-1 pt-0.5 space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">New workspace</p>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateWorkspace();
                      if (e.key === 'Escape') { setShowNewWs(false); setNewWsName(''); }
                    }}
                    placeholder="Workspace name…"
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none transition-colors"
                  />
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={!newWsName.trim()}
                    className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-300 text-xs font-medium transition-all disabled:opacity-40"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => { setShowNewWs(false); setNewWsName(''); }}
                    className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setShowNewWs(true); setShowInvite(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all text-sm"
              >
                <Plus size={14} />
                New workspace
              </button>
            )}

            {/* Invite toggle */}
            <button
              onClick={() => { setShowInvite((v) => !v); setShowNewWs(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all text-sm"
            >
              <Users size={14} />
              Invite member
            </button>
          </div>

          {/* Signed-in user */}
          {user && (
            <div className="border-t border-slate-800/80 px-4 py-2.5 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400/80 to-emerald-400/80 flex items-center justify-center text-black font-bold text-[10px] shrink-0 select-none">
                {(user.firstName?.[0] ?? user.emailAddresses?.[0]?.emailAddress?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">
                  {user.fullName ?? user.emailAddresses?.[0]?.emailAddress ?? ''}
                </p>
                <p className="text-[10px] text-slate-600">Signed in</p>
              </div>
            </div>
          )}

          {/* Invite form */}
          {showInvite && (
            <div className="border-t border-slate-800/80 p-3 space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest select-none">
                Invite to &ldquo;{current?.name}&rdquo;
              </p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                  placeholder="teammate@email.com"
                  className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none transition-colors"
                />
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || !inviteEmail.includes('@')}
                  className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-300 text-xs font-medium transition-all disabled:opacity-40 whitespace-nowrap"
                >
                  {inviteDone ? '✓ Sent' : 'Invite'}
                </button>
              </div>

              {/* Member list */}
              {current && current.members.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {current.members.map((email) => (
                    <div key={email} className="flex items-center gap-2 text-xs text-slate-500 px-1">
                      <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-400 shrink-0">
                        {email[0].toUpperCase()}
                      </div>
                      <span className="truncate">{email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
