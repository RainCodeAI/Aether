// components/geospatial/AetherMap.tsx
'use client';

import dynamic from 'next/dynamic';

const AetherMapClient = dynamic(() => import('./AetherMapClient'), {
  ssr: false,
  loading: () => (
    <div className="h-[720px] w-full rounded-3xl border border-slate-800 flex items-center justify-center text-slate-500">
      Loading map...
    </div>
  ),
});

export default function AetherMap() {
  return <AetherMapClient />;
}
