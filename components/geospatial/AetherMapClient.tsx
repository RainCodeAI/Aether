// components/geospatial/AetherMapClient.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useAetherStore } from '@/lib/store';
import { Filter, X } from 'lucide-react';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet-defaulticon-compatibility';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function AetherMapClient() {
  const { data, setSelectedNode } = useAetherStore();

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  const locations = data.nodes.filter(node => node.type === 'Location');

  const filteredLocations = useMemo(() => {
    if (filterStatus === 'All') return locations;

    return locations.filter(location => {
      const connectedProjects = data.relationships
        .filter(r => r.from === location.id || r.to === location.id)
        .map(rel => {
          const connectedId = rel.from === location.id ? rel.to : rel.from;
          return data.nodes.find(n => n.id === connectedId && n.type === 'Project');
        })
        .filter(Boolean);

      return connectedProjects.some(proj =>
        proj!.properties.status === filterStatus
      );
    });
  }, [locations, filterStatus, data]);

  const projectStatuses = ['All', 'Active', 'Planning', 'Completed'];

  return (
    <div className="h-[720px] w-full rounded-3xl overflow-hidden border border-slate-800 relative">
      <MapContainer
        center={[43.37, -80.98]}
        zoom={10}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {filteredLocations.map((location) => {
          const coords = location.properties.coordinates as { lat?: number; lng?: number } | undefined;
          if (!coords?.lat || !coords?.lng) return null;

          return (
            <Marker
              key={location.id}
              position={[coords.lat, coords.lng]}
              eventHandlers={{ click: () => setSelectedNode(location) }}
            >
              <Popup className="custom-popup">
                <div className="text-slate-900 min-w-[220px]">
                  <h3 className="font-semibold text-lg">{location.label}</h3>
                  <p className="text-sm text-slate-600">
                    {location.properties.city as string}, {location.properties.province as string}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Connected Projects</p>
                    {data.relationships
                      .filter(r => r.from === location.id || r.to === location.id)
                      .map(rel => {
                        const projId = rel.from === location.id ? rel.to : rel.from;
                        const proj = data.nodes.find(n => n.id === projId && n.type === 'Project');
                        return proj ? (
                          <div key={rel.id} className="text-sm py-1 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                            {proj.label}
                          </div>
                        ) : null;
                      })}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Filter Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="glass flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-700 hover:border-slate-500 transition-colors"
        >
          <Filter size={18} />
          <span>Filters</span>
        </button>

        {showFilters && (
          <div className="glass w-64 p-5 rounded-3xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Project Status Filter</h4>
              <button onClick={() => setShowFilters(false)}><X size={18} /></button>
            </div>

            <div className="space-y-2">
              {projectStatuses.map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all ${
                    filterStatus === status
                      ? 'bg-cyan-500 text-black font-medium'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend / Stats */}
      <div className="absolute bottom-4 left-4 glass p-4 rounded-2xl border border-slate-700 z-[1000] text-sm">
        <div className="font-medium">Stratford Region</div>
        <div className="text-xs text-slate-400 mt-1">
          {filteredLocations.length} locations • {filterStatus !== 'All' && `${filterStatus} projects`}
        </div>
      </div>
    </div>
  );
}
