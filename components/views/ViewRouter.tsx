// components/views/ViewRouter.tsx
'use client';

import { useAetherStore } from '@/lib/store';
import DashboardView from '@/components/views/DashboardView';
import ProjectsView from '@/components/views/ProjectsView';
import EntitiesView from '@/components/views/EntitiesView';
import SearchView from '@/components/views/SearchView';
import GeospatialView from '@/components/views/GeospatialView';
import AnalyticsView from '@/components/views/AnalyticsView';
import TablePage from '@/components/views/TablePage';
import KanbanPage from '@/components/views/KanbanPage';
import DataPage from '@/components/views/DataPage';
import TimelineView from '@/components/timeline/TimelineView';
import CalendarView from '@/components/calendar/CalendarView';

interface ViewRouterProps {
  onImportClick: () => void;
}

export default function ViewRouter({ onImportClick }: ViewRouterProps) {
  const currentView = useAetherStore((s) => s.currentView);

  switch (currentView) {
    case 'dashboard':
      return <DashboardView onImportClick={onImportClick} />;
    case 'projects':
      return <ProjectsView onImportClick={onImportClick} />;
    case 'entities':
      return <EntitiesView onImportClick={onImportClick} />;
    case 'search':
      return <SearchView />;
    case 'geospatial':
      return <GeospatialView />;
    case 'analytics':
      return <AnalyticsView />;
    case 'timeline':
      return <TimelineView />;
    case 'table':
      return <TablePage />;
    case 'kanban':
      return <KanbanPage />;
    case 'data':
      return <DataPage />;
    case 'calendar':
      return <CalendarView />;
    default:
      return <DashboardView onImportClick={onImportClick} />;
  }
}
