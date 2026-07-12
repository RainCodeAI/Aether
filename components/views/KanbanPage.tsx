// components/views/KanbanPage.tsx
'use client';

import { Plus } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import KanbanView from '@/components/views/KanbanView';

export default function KanbanPage() {
  const { data, setNewEntityModalOpen } = useAetherStore();
  const projectCount = data.nodes.filter((n) => n.type === 'Project').length;

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] sm:h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-5 sm:mb-8 gap-3 shrink-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter">Kanban Board</h1>
          <p className="text-slate-400 mt-1">
            {projectCount} projects · drag to change status
          </p>
        </div>
        <button
          onClick={() => setNewEntityModalOpen(true)}
          className="self-start sm:self-auto px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> New Project
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <KanbanView />
      </div>
    </div>
  );
}
