# Aether — Personal Intelligence OS

Build a knowledge graph of the people, projects, locations, metrics, events, and documents in your world — then explore it across multiple views and interrogate it with natural-language AI analysis.

**Local-first by default.** All ontology data lives in the browser (`localStorage` via Zustand). Auth (Clerk) and cloud sync (Convex) are optional and staged.

---

## Features

### Knowledge Graph
- **7 entity types** — Person, Project, Location, Metric, Event, Insight, Document
- **Typed relationships** — `worksOn`, `locatedAt`, `hasMetric`, `mentions`, `hasDocument`, and custom types
- **First-class store mutations** — `addNode`, `updateNode`, `removeNodes`, `addRelationship`, …
- **NodeDetailPanel** — properties, tags, connections, PDF attach, share link
- **Graph view** — ReactFlow + Dagre layout

### Workspaces
- Multiple named workspaces, each with its **own isolated graph**
- Create / switch / delete workspaces
- Snapshots scoped to the active workspace
- Member invite list is local metadata today (cloud invites land with Convex)

### Views

| View | Description |
|---|---|
| **Entities** | Card grid with search, type filter, tag filter |
| **Table** | Sortable, filterable table with bulk-delete and column picker |
| **Kanban** | Project status board (Planning → Active → At Risk → Complete) |
| **Timeline** | Gantt-style project timeline |
| **Calendar** | Month grid with entity dots and day detail |
| **Geospatial** | Leaflet map for Location entities |
| **Analytics** | Recharts dashboards |
| **Data** | Snapshots, CSV import, enrichment |

### AI Analysis
- Natural-language query bar
- **9 intent modes** — financial, risk, team, projects, location, opportunity, summary, connection discovery, scenario projection
- **OpenAI GPT-4o** via `/api/analyze` when `OPENAI_API_KEY` is set
- **Rule-based fallback** offline / without a key
- Results can be saved as Insight nodes or tasks

### Ingest & Export
- PDF upload + heuristic entity extraction
- CSV import (append or replace)
- Enrichment suggestions (coords, roles, status)
- Export JSON / CSV / PNG / branded PDF report

### Auth (optional)
- Clerk sign-in / sign-up pages
- Middleware protects routes only when a real publishable key is configured
- App remains fully usable without Clerk

### Mobile
- Responsive layout, hamburger sidebar, bottom nav
- Bottom-sheet modals on small screens

---

## Getting Started

```bash
cd aether
npm install
cp .env.example .env.local   # then fill in any keys you need
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: OpenAI

```env
OPENAI_API_KEY=sk-...
```

Restart the dev server. Without a key, the rule engine runs automatically.

### Optional: Clerk

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

Placeholder / short keys are ignored so local development does not require auth.

### Optional: Convex (Phase 2)

```env
# NEXT_PUBLIC_CONVEX_URL=https://....convex.cloud
```

Provider is already scaffolded (`ConvexClientProvider`). No `convex/` schema yet — see roadmap below.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| State | Zustand 5 + `persist` (`aether-storage-v1`, schema version 1) |
| Auth | Clerk (optional) |
| Backend (planned) | Convex |
| Graph | ReactFlow + Dagre |
| Maps | Leaflet + react-leaflet |
| Charts | Recharts |
| PDF | pdfjs-dist + `@react-pdf/renderer` |
| LLM | OpenAI SDK (`gpt-4o`) |

---

## Project Structure

```
app/
  api/analyze/route.ts     # OpenAI POST handler
  layout.tsx               # Clerk + Convex providers
  page.tsx                 # Main shell — views, modals, import
  sign-in/ sign-up/        # Clerk pages
components/
  ai/                      # AIInsightsPanel
  calendar/ collaboration/ dashboard/ data/
  entities/ geospatial/ layout/ ontology/
  reports/ search/ timeline/ ui/ views/
  providers/ConvexClientProvider.tsx
lib/
  store.ts                 # Zustand — workspace-scoped data + mutations
  data.ts                  # Seed graph for Personal workspace
  ai-search.ts             # Intent detection + rule engine + LLM client
  pdf-extract.ts csv-import.ts enrich.ts export.ts import.ts share.ts
proxy.ts                   # Clerk middleware (no-op without real keys)
types/index.ts             # OntologyNode, Relationship, Workspace, …
```

---

## Data Model

Graphs are stored **per workspace** in `localStorage`:

```ts
interface OntologyNode {
  id: string;
  type: EntityType;          // Person | Project | Location | Metric | Event | Insight | Document
  label: string;
  properties: Record<string, unknown>;
  tags?: string[];
  createdAt?: string;        // YYYY-MM-DD
}

interface Relationship {
  id: string;
  type: string;
  from: string;
  to: string;
  properties?: Record<string, unknown>;
}
```

Store shape (simplified):

```ts
{
  currentWorkspaceId: string;
  workspaces: Workspace[];
  workspaceData: Record<workspaceId, AetherData>;  // isolated graphs
  data: AetherData;                                 // active workspace mirror
  snapshots: Snapshot[];                            // tagged with workspaceId
}
```

---

## Sprint History

| Sprint | Focus | Key additions |
|---|---|---|
| **1** | Collaboration UI | Workspaces switcher, share links (`?share=`), share button |
| **2** | Mobile & responsive | Hamburger sidebar, bottom nav, bottom-sheet modals |
| **3** | PDF + Calendar | PDF entity extraction, CalendarView |
| **4** | LLM + Auth scaffold | `/api/analyze` GPT-4o, Clerk optional auth, Convex provider stub |
| **5** | Data integrity | Workspace-scoped graphs, store mutations, seed data, docs |

---

## Roadmap (next)

1. **Convex Phase 2** — schema for workspaces / nodes / relationships; authenticated membership
2. **Real share** — server-backed share records (or payload tokens) so recipients need not share `localStorage`
3. **Tests + CI** — intent detection, import validation, workspace isolation, mutations
4. **Split `page.tsx`** — view shell vs. per-view containers
5. **AI retrieval** — top-k context instead of full-graph prompts

---

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
npm test             # unit tests (vitest)
npm run test:watch   # vitest in watch mode
```

### Tests

Unit tests live next to pure libs (`lib/*.test.ts`):

| Suite | Covers |
|---|---|
| `ai-search.test.ts` | `detectIntent`, `searchOntology` |
| `store.test.ts` | mutations, workspace isolation, snapshots |
| `share.test.ts` | encode/decode share tokens |
| `import.test.ts` | JSON import validation & warnings |

```bash
npm test
```
