// components/views/GeospatialView.tsx
'use client';

import { useAetherStore } from '@/lib/store';
import AetherMap from '@/components/geospatial/AetherMap';

export default function GeospatialView() {
  const { data, setNewEntityModalOpen } = useAetherStore();
  const locationCount = data.nodes.filter((n) => n.type === 'Location').length;

  return (
    <div className="aether-view-enter">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tighter">Geospatial Intelligence</h1>
          <p className="text-slate-400 mt-1">
            Location ontology • {locationCount} sites • Connected insights
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setNewEntityModalOpen(true)}
            className="px-5 py-2.5 border border-slate-700 hover:border-slate-500 rounded-xl text-sm transition-colors"
          >
            Add Location
          </button>
        </div>
      </div>

      <AetherMap />
    </div>
  );
}
