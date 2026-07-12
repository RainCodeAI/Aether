// components/views/ProjectsView.tsx
'use client';

import { useState } from 'react';
import { Plus, Upload, FolderOpen, LayoutGrid, Table2, Columns2 } from 'lucide-react';
import { useAetherStore } from '@/lib/store';
import TableView from '@/components/views/TableView';
import KanbanView from '@/components/views/KanbanView';
import EmptyState from '@/components/ui/EmptyState';

interface ProjectsViewProps {
  onImportClick: () => void;
}

type SubView = 'grid' | 'table' | 'kanban';

export default function ProjectsView({ onImportClick }: ProjectsViewProps) {
  const { data, setSelectedNode, setNewEntityModalOpen } = useAetherStore();
  const [subView, setSubView] = useState<SubView>('grid');

  const projects = data.nodes.filter((n) => n.type === 'Project');

  return (
    <div
      className={`aether-view-enter flex flex-col ${
        subView === 'kanban' ? 'h-[calc(100vh-8rem)]' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tighter">Projects</h1>
          <p className="text-slate-400 mt-1">{projects.length} total projects</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            {(
              [
                { id: 'grid', icon: LayoutGrid, label: 'Grid' },
                { id: 'table', icon: Table2, label: 'Table' },
                { id: 'kanban', icon: Columns2, label: 'Kanban' },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setSubView(id)}
                title={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  subView === id
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setNewEntityModalOpen(true)}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> New Project
          </button>
        </div>
      </div>

      {projects.length === 0 && (
        <div className="glass rounded-3xl">
          <EmptyState
            icon={FolderOpen}
            color="violet"
            title="No projects in the pipeline"
            description="Track initiatives from planning to completion — budgets, progress, risks, and team connections in one place."
            actions={[
              {
                label: 'Create Project',
                icon: Plus,
                onClick: () => setNewEntityModalOpen(true),
              },
              {
                label: 'Import Data',
                icon: Upload,
                onClick: onImportClick,
                variant: 'secondary',
              },
            ]}
            hint="Tip: set a status of Planning, Active, or Complete to visualise in Kanban"
            size="lg"
          />
        </div>
      )}

      {subView === 'grid' && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 aether-grid-stagger">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedNode(project)}
              className="glass-card rounded-3xl p-8 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-semibold group-hover:text-cyan-400 transition-colors">
                  {project.label}
                </h3>
                <div
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    project.properties.status === 'Active'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : project.properties.status === 'Planning'
                        ? 'bg-amber-500/20 text-amber-400'
                        : project.properties.status === 'At Risk'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {String(project.properties.status ?? 'Planning')}
                </div>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Budget</span>
                  <span className="font-medium">
                    ${project.properties.budget?.toLocaleString() || '—'}
                  </span>
                </div>
                {project.properties.progress !== undefined && (
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-slate-400">Progress</span>
                      <span>{String(project.properties.progress)}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full progress-fill"
                        style={{ width: `${project.properties.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {!!project.properties.priority && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Priority</span>
                    <span className="font-medium capitalize">
                      {String(project.properties.priority)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {subView === 'table' && projects.length > 0 && (
        <TableView typeFilter="Project" compact />
      )}

      {subView === 'kanban' && projects.length > 0 && (
        <div className="flex-1 min-h-0">
          <KanbanView />
        </div>
      )}
    </div>
  );
}
