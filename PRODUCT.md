# Aether — Product Brief & v1 Scope

**Status:** Living document · local-first product  
**Last updated:** 2026-07-12  
**Audience:** Maintainers and future-you (not end-user marketing)

---

## One-liner

**Aether is a local-first personal intelligence OS:** a knowledge graph of people, projects, places, metrics, and documents you can explore in multiple views and interrogate with optional AI.

It is **not** (yet) a team collaboration platform, a general notes app, or an enterprise multi-tenant SaaS.

---

## Problem

People run complex personal and professional context — relationships, initiatives, risks, locations, numbers — across tools that don’t connect. Spreadsheets lose structure; docs lose relationships; pure chat forgets the graph.

**Job to be done (primary):**  
> *“Help me keep a living model of the things and people that matter, see them clearly, and get sharp answers when I ask.”*

---

## Beachhead (v1 focus)

**Primary persona (choose and keep for 3–6 months):**

**Founder / PM / operator** running a small portfolio of projects, people, and metrics — personal ops, not company-wide OS.

Templates (startup, job hunt, research) remain available as **secondary entry packs**. Marketing, defaults, empty-state copy, and demo path should lead with the primary persona.

**Primary loop to protect and polish:**

```
Capture / import → structure (entities + relationships)
  → explore (dashboard, table, kanban, map as needed)
  → insight (AI / rules)
  → action (edit, status, connect, export)
```

---

## Positioning

| We are | We are not |
|--------|------------|
| Solo, local-first intelligence console | Team “shared brain” (until real cloud) |
| Graph-native ops context | Notion / Obsidian clone |
| Optional cloud later | Full multiplayer SaaS today |
| Structured entities + edges | Freeform daily notes only |

**Narrative that matches the product today:**  
*Your intelligence graph lives on your machine. Optional AI and auth when you want them. Sync and real share come when the backend lands.*

Do not market invite members or share links as complete multi-user until Convex (or equivalent) backs them.

---

## Current strengths

1. Clear domain model (nodes + typed relationships)  
2. Local-first honesty with export/import and optional APIs  
3. Cohesive craft (ops aesthetic, palette, shortcuts, undo, templates)  
4. Real workflows (PDF/CSV ingest, path finder, multi-workspace backup)  
5. Engineering hygiene for stage (mutations, tests, CI)  
6. Graceful degradation without OpenAI / Clerk  

---

## Current weaknesses

1. Collab UI ahead of collab reality (share, members)  
2. No multi-device sync  
3. Multiple entry narratives (startup / job / research / “OS”) without a single lead  
4. AI quality depends on graph density and structure  
5. Freeform properties → weak guarantees for views/analytics  
6. Session-only undo; browser-local durability  
7. Broad view surface = maintenance cost  

---

## v1 Scope (in)

### Must remain excellent

- **Ontology:** create/edit entities and relationships; integrity (delete edges, reverse, type, broken-link cleanup)  
- **Workspaces:** isolated graphs; create with template; empty onboarding  
- **Core views:** Dashboard (graph), Table, Kanban (projects), Data (snapshots/import)  
- **Capture:** New entity, CSV import, JSON import (graph + multi-workspace), PDF extract  
- **Safety:** Undo/redo, export current + all workspaces, import merge/replace, settings reset  
- **AI:** Optional LLM analysis with top-k context; offline rule fallback  
- **Navigation:** Command palette, keyboard shortcuts, settings  

### Supported but not expanded without reason

- Geospatial, Calendar, Timeline, Analytics  
- Path finder / neighborhood focus  
- PDF reports  
- Clerk optional shell (no multi-user product claims)  
- Convex provider stub only (no schema/sync until Phase 2)  

### Explicit non-goals (v1)

| Non-goal | Why |
|----------|-----|
| Real multi-user collaboration | Needs durable backend + permissions |
| Working cross-user share links | Token without server payload is theater |
| Mobile-first parity | Power tool; responsive is enough |
| Perfect offline multiplayer sync | Complexity without beachhead |
| Expanding the rule engine into a second AI product | Prefer one LLM path + thin fallback |
| New top-level views “for completeness” | Breadth already high |
| Custom scripting / plugins | Too early |
| Billing, orgs, SSO | Post product-market fit |
| Replacing Notion/Linear/CRM wholesale | Stay a graph console, not an office suite |

---

## Success metrics (v1 qualitative)

A successful v1 session for the beachhead user:

1. Create or open a workspace from a relevant template (or import real data)  
2. Add/edit a few entities and relationships without confusion  
3. Use at least one non-dashboard view usefully (e.g. Kanban status)  
4. Ask a natural-language question and get a grounded answer (LLM or rules)  
5. Export a backup and feel safe  

If those five fail, new features won’t save the product.

---

## Phase 2 (backend) — when ready

**Goal:** same personal product, portable and shareable — not full multiplayer.

Suggested order:

1. Convex (or equivalent) schema: users, workspaces, nodes, relationships  
2. Auth-linked ownership (Clerk wired for real)  
3. Optional sync: local-first with cloud backup, or cloud-primary with offline cache  
4. **Real share:** server-backed read-only snapshot or live read-only workspace view  
5. Only then: invites with real membership  

**Still non-goals for early Phase 2:** realtime co-editing, complex roles, org hierarchies.

---

## Drift guardrails

Before adding a feature, ask:

1. Does it strengthen **capture → graph → explore → insight → action** for the beachhead persona?  
2. Does it require collab/cloud? If yes, is Phase 2 active? If not, don’t ship half-promises.  
3. Does it add a **new surface** (view/modal/engine) that we must maintain forever? Prefer deepening existing surfaces.  
4. Can we **say no** and still tell a clear product story?

If two or more answers are “no / unclear,” park the idea.

---

## Messaging checklist

**OK to say**

- Personal knowledge graph / intelligence console  
- Local-first; data on your device  
- Optional OpenAI analysis  
- Multiple workspaces and templates  
- Export and restore backups  

**Avoid until true**

- “Collaborate with your team”  
- “Share a live view with anyone” (unless server-backed)  
- “Enterprise-ready”  
- “Replaces your entire stack”  

---

## Near-term product priorities (ordered)

1. **Hold the line** on scope; fix UX debt when found (modals, empty states, copy)  
2. **Beachhead clarity** in README/onboarding/default template emphasis  
3. **Collab honesty** — label experimental or hide until backend  
4. **Capture + graph quality** over new modules  
5. **Phase 2 Convex** when headspace allows multi-device + real share  

---

## Summary

Aether is a **credible solo, local-first product** with a coherent spine and above-average craft. Viability without DB/Clerk is real **if** we own that story and pick a beachhead. The main risk is **breadth and collab theater** diluting focus. v1 wins by deepening the personal ops graph loop—not by becoming a team platform early.

---

*This document guides product decisions. Implementation details live in `README.md` and the codebase.*
