// lib/ai-search.ts
import { AetherData, OntologyNode } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalysisIntent =
  | 'financial'
  | 'risk'
  | 'team'
  | 'projects'
  | 'location'
  | 'opportunity'
  | 'summary'
  | 'connection_discovery'
  | 'scenario_projection'
  | 'search';

export interface AnalysisMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface ReasoningTrace {
  nodesAnalyzed: string[];  // node IDs referenced during analysis
  relsAnalyzed: string[];   // relationship IDs referenced
  dataPoints: string[];     // human-readable explanation of what was examined
}

export interface AutoInsight {
  id: string;
  title: string;
  description: string;
  severity: 'risk' | 'opportunity' | 'info';
  intent: AnalysisIntent;
  query: string;
}

export interface AnalysisResult {
  intent: AnalysisIntent;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;  // 0–100
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  relatedNodeIds: string[];
  metrics?: AnalysisMetric[];
  reasoningTrace: ReasoningTrace;
}

export interface SavedInsight {
  id: string;
  timestamp: string;
  query: string;
  result: AnalysisResult;
}

// ─── LLM-ready architecture ───────────────────────────────────────────────────
// Swap the body of this function to call Grok API, Ollama, or any LLM provider.
// The rule-based engine below runs as a fallback / offline mode.

export async function runLLMAnalysis(
  query: string,
  context: { data: AetherData }
): Promise<AnalysisResult> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, context }),
    });
    if (!response.ok) {
      // 503 = no API key configured; fall back silently to rule engine
      return generateInsight(context.data, query);
    }
    const result = await response.json() as AnalysisResult;
    // Sanity-check the response has required fields before trusting it
    if (!result.summary || !Array.isArray(result.keyFindings)) {
      return generateInsight(context.data, query);
    }
    return result;
  } catch {
    return generateInsight(context.data, query);
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function searchOntology(data: AetherData, query: string): OntologyNode[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return data.nodes.filter((node) => {
    const text = [
      node.label,
      node.type,
      ...Object.values(node.properties).map((v) =>
        typeof v === 'string' ? v : JSON.stringify(v)
      ),
    ]
      .join(' ')
      .toLowerCase();
    return text.includes(q);
  });
}

// ─── Intent detection ─────────────────────────────────────────────────────────

export function detectIntent(query: string): AnalysisIntent {
  const q = query.toLowerCase();

  // Must check scenario_projection before 'projects' to avoid false match on "project"
  if (/what if|forecast|scenario|predict|trajector|project.*(next|by|in \d)|grow|decline/.test(q))
    return 'scenario_projection';
  if (/\bconnection\b|network.map|hub|isolated|bridge|cluster|who.*connect|unlink|orphan/.test(q))
    return 'connection_discovery';
  if (/revenue|budget|money|financial|cost|spend|metric|profit|cash|fund|roi|invoice/.test(q))
    return 'financial';
  if (/risk|problem|issue|blocker|danger|concern|threat|fail|block|warn|critical|alert/.test(q))
    return 'risk';
  if (/team|people|person|who|staff|member|employee|founder|advisor|talent|hire|org/.test(q))
    return 'team';
  if (/project|launch|status|progress|deliver|milestone|sprint|deadline|roadmap|portfolio/.test(q))
    return 'projects';
  if (/location|where|ontario|geography|office|hub|site|region|city|map|geo|place/.test(q))
    return 'location';
  if (/opportunit|growth|expand|potential|market|scale|future|invest|strategy|gap|untapped/.test(q))
    return 'opportunity';
  if (/summary|overview|tell me|what is|show all|everything|report|brief|snapshot|dashboard/.test(q))
    return 'summary';
  return 'search';
}

// ─── Confidence score helper ──────────────────────────────────────────────────

function computeConfidence(
  relevantEntityCount: number,
  totalRelationships: number,
  totalNodes: number
): { label: AnalysisResult['confidence']; score: number } {
  let score = 20;
  score += Math.min(relevantEntityCount * 12, 48); // up to +48 for relevant entities
  score += Math.min(totalRelationships * 3, 18);   // up to +18 for relationships
  score += Math.min(totalNodes * 1, 9);             // up to +9 for overall graph size
  score = Math.min(score, 95);

  const label: AnalysisResult['confidence'] =
    score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { label, score: Math.round(score) };
}

// ─── Main analysis engine ─────────────────────────────────────────────────────

export function generateInsight(data: AetherData, query: string): AnalysisResult {
  const intent  = detectIntent(query);
  const matched = searchOntology(data, query);

  const people    = data.nodes.filter((n) => n.type === 'Person');
  const projects  = data.nodes.filter((n) => n.type === 'Project');
  const locations = data.nodes.filter((n) => n.type === 'Location');
  const metrics   = data.nodes.filter((n) => n.type === 'Metric');
  const insights  = data.nodes.filter((n) => n.type === 'Insight');

  const activeProjects = projects.filter((p) => p.properties.status === 'Active');
  const totalBudget    = projects.reduce((s, p) => s + (Number(p.properties.budget) || 0), 0);
  const avgProgress    = projects.length
    ? Math.round(projects.reduce((s, p) => s + (Number(p.properties.progress) || 0), 0) / projects.length)
    : 0;

  let summary          = '';
  let keyFindings:     string[] = [];
  let recommendations: string[] = [];
  let analysisMetrics: AnalysisMetric[] = [];
  let tracedNodeIds:   string[] = [];
  let tracedRelIds:    string[] = [];
  let dataPoints:      string[] = [];
  let confidence:      ReturnType<typeof computeConfidence>;

  switch (intent) {

    // ── Financial ──────────────────────────────────────────────────────────
    case 'financial': {
      const totalRevenue = metrics.reduce((s, m) => s + (Number(m.properties.value) || 0), 0);
      const highBudgetProjects = projects.filter(p => Number(p.properties.budget) > 30000);
      const lowProgressHighBudget = projects.filter(
        p => Number(p.properties.progress) < 30 && Number(p.properties.budget) > 20000
      );
      const budgetEfficiency = totalBudget > 0
        ? Math.round((avgProgress / 100) * totalBudget)
        : 0;

      tracedNodeIds = [...projects.map(p => p.id), ...metrics.map(m => m.id)];
      tracedRelIds  = data.relationships
        .filter(r => tracedNodeIds.includes(r.from) || tracedNodeIds.includes(r.to))
        .map(r => r.id);
      dataPoints = [
        `${projects.length} project${projects.length !== 1 ? 's' : ''} with budget data`,
        `${metrics.length} revenue metric${metrics.length !== 1 ? 's' : ''} tracked`,
        totalBudget > 0 ? `Total allocation: $${totalBudget.toLocaleString()} CAD` : 'No budget data',
        `Average progress: ${avgProgress}%`,
      ];

      confidence = computeConfidence(metrics.length + projects.length, data.relationships.length, data.nodes.length);

      summary = `Financial intelligence across ${data.nodes.length} entities. Total project investment: $${totalBudget.toLocaleString()} CAD across ${projects.length} project${projects.length !== 1 ? 's' : ''}. ${metrics.length} revenue metric${metrics.length !== 1 ? 's' : ''} tracked — current value: $${totalRevenue.toLocaleString()}. Estimated capital deployed based on progress: $${budgetEfficiency.toLocaleString()}.`;

      keyFindings = [
        `${activeProjects.length} of ${projects.length} projects actively spending — ${projects.filter(p => p.properties.status === 'Planning').length} in pre-spend planning`,
        ...metrics.map(m =>
          `${m.label}: ${Number(m.properties.value).toLocaleString()} ${m.properties.unit || ''} — trend ${m.properties.trend ?? 'stable'}`
        ),
        totalBudget > 0
          ? `Avg project budget: $${Math.round(totalBudget / Math.max(projects.length, 1)).toLocaleString()} CAD | Portfolio avg completion: ${avgProgress}%`
          : 'No budget data found — add budget properties to projects',
        lowProgressHighBudget.length > 0
          ? `⚠ Capital risk: ${lowProgressHighBudget.map(p => p.label).join(', ')} — high budget, low progress`
          : 'Budget-to-progress ratios look healthy across portfolio',
        highBudgetProjects.length > 0
          ? `Strategic bets (>$30k): ${highBudgetProjects.map(p => `${p.label} ($${Number(p.properties.budget).toLocaleString()})`).join(', ')}`
          : null,
      ].filter(Boolean) as string[];

      recommendations = [
        lowProgressHighBudget.length > 0
          ? `Immediate action: schedule financial review for ${lowProgressHighBudget[0].label}`
          : 'Cross-reference budget allocation against quarterly milestones',
        'Flag projects below 30% progress with budgets over $20k for executive review',
        metrics.length < 2
          ? 'Add revenue, MRR, or ARR metrics to strengthen financial visibility'
          : 'Maintain metric tracking cadence — aim for weekly updates on key figures',
        'Model financial dependencies using "funds" relationships between Metrics and Projects',
      ];

      analysisMetrics = [
        { label: 'Total Budget', value: `$${totalBudget.toLocaleString()}`, trend: 'neutral' },
        { label: 'Avg Progress', value: `${avgProgress}%`, trend: avgProgress > 50 ? 'up' : 'neutral' },
        ...metrics.map(m => ({
          label: m.label,
          value: `${Number(m.properties.value).toLocaleString()} ${m.properties.unit || ''}`.trim(),
          trend: m.properties.trend as AnalysisMetric['trend'],
        })),
      ];
      break;
    }

    // ── Risk ───────────────────────────────────────────────────────────────
    case 'risk': {
      const lowProgress    = activeProjects.filter(p => Number(p.properties.progress) < 40);
      const planning       = projects.filter(p => p.properties.status === 'Planning');
      const isolatedPeople = people.filter(
        p => !data.relationships.some(r => r.from === p.id || r.to === p.id)
      );
      const orphanNodes    = data.nodes.filter(n =>
        n.type !== 'Insight' &&
        !data.relationships.some(r => r.from === n.id || r.to === n.id)
      );
      const riskScore = (lowProgress.length * 3) + (isolatedPeople.length * 2) + (orphanNodes.length * 1);

      tracedNodeIds = [...projects.map(p => p.id), ...people.map(p => p.id)];
      tracedRelIds  = data.relationships.filter(r =>
        tracedNodeIds.includes(r.from) || tracedNodeIds.includes(r.to)
      ).map(r => r.id);
      dataPoints = [
        `${lowProgress.length} active project${lowProgress.length !== 1 ? 's' : ''} below 40% progress`,
        `${isolatedPeople.length} unconnected team member${isolatedPeople.length !== 1 ? 's' : ''}`,
        `${orphanNodes.length} entity${orphanNodes.length !== 1 ? 'ies' : ''} with no relationships`,
        `Risk score: ${riskScore} (${riskScore < 3 ? 'low' : riskScore < 8 ? 'moderate' : 'high'})`,
      ];

      confidence = computeConfidence(
        lowProgress.length + projects.length,
        data.relationships.length,
        data.nodes.length
      );

      summary = `Risk analysis across ${projects.length} project${projects.length !== 1 ? 's' : ''} and ${people.length} team member${people.length !== 1 ? 's' : ''}. ${lowProgress.length > 0 ? `${lowProgress.length} active project${lowProgress.length !== 1 ? 's' : ''} show below-threshold progress.` : 'No critical delivery risks detected.'} Composite risk score: ${riskScore} (${riskScore < 3 ? 'low' : riskScore < 8 ? 'moderate' : 'high'}). ${orphanNodes.length} isolated entities may represent undocumented dependencies.`;

      keyFindings = [
        lowProgress.length > 0
          ? `⚠ Delivery risk: ${lowProgress.map(p => `${p.label} (${p.properties.progress ?? 0}%)`).join(', ')} — active but underperforming`
          : 'All active projects meeting minimum progress thresholds',
        planning.length > 0
          ? `${planning.length} project${planning.length !== 1 ? 's' : ''} in planning phase — no deliverables yet: ${planning.map(p => p.label).join(', ')}`
          : 'No stalled planning-phase projects',
        isolatedPeople.length > 0
          ? `⚠ Key-person risk: ${isolatedPeople.map(p => p.label).join(', ')} unlinked to any project`
          : `Team coverage: ${people.length} member${people.length !== 1 ? 's' : ''} all connected`,
        orphanNodes.length > 0
          ? `⚠ ${orphanNodes.length} isolated entit${orphanNodes.length !== 1 ? 'ies' : 'y'} (${orphanNodes.map(n => n.label).slice(0, 3).join(', ')}) — undocumented dependencies likely`
          : `Relationship graph is well-connected — ${data.relationships.length} edges mapped`,
        data.relationships.length < 3
          ? '⚠ Sparse relationship graph — structural risks may be hidden'
          : null,
      ].filter(Boolean) as string[];

      recommendations = [
        lowProgress.length > 0
          ? `Immediate: schedule stakeholder sync for ${lowProgress[0].label} — ${lowProgress[0].properties.progress ?? 0}% progress is below threshold`
          : 'Maintain current project velocity and review milestones monthly',
        'Document all external dependencies as graph relationships to surface hidden risks',
        orphanNodes.length > 0
          ? `Connect isolated entities: ${orphanNodes.slice(0, 2).map(n => n.label).join(', ')} need relationship context`
          : 'Graph connectivity is healthy — continue building relationship context',
        'Identify single points of failure: map "reportsTo" and "dependsOn" relationships',
      ];

      analysisMetrics = [
        { label: 'Risk Score',     value: `${riskScore}`,              trend: riskScore > 5 ? 'down' : 'up' },
        { label: 'At-Risk Projects', value: `${lowProgress.length}`,   trend: lowProgress.length > 0 ? 'down' : 'up' },
        { label: 'Isolated Entities', value: `${orphanNodes.length}`,  trend: orphanNodes.length > 0 ? 'down' : 'up' },
        { label: 'Relationship Density', value: `${(data.relationships.length / Math.max(data.nodes.length, 1)).toFixed(1)}x`, trend: 'neutral' },
      ];
      break;
    }

    // ── Team ───────────────────────────────────────────────────────────────
    case 'team': {
      const roles  = [...new Set(people.map(p => p.properties.role).filter(Boolean))];
      const linked = people.filter(p =>
        data.relationships.some(r => r.from === p.id && r.type === 'worksOn')
      );
      const projectLeads = new Map<string, string[]>();
      data.relationships
        .filter(r => r.type === 'worksOn')
        .forEach(r => {
          const proj = data.nodes.find(n => n.id === r.to);
          if (proj) {
            const existing = projectLeads.get(proj.id) || [];
            const person   = data.nodes.find(n => n.id === r.from);
            if (person) projectLeads.set(proj.id, [...existing, person.label]);
          }
        });

      tracedNodeIds = people.map(p => p.id);
      tracedRelIds  = data.relationships
        .filter(r => people.some(p => p.id === r.from || p.id === r.to))
        .map(r => r.id);
      dataPoints = [
        `${people.length} team member${people.length !== 1 ? 's' : ''} in ontology`,
        `${roles.length} distinct role${roles.length !== 1 ? 's' : ''}: ${roles.join(', ') || 'none documented'}`,
        `${linked.length} of ${people.length} linked to active projects`,
        `${projects.length - projectLeads.size} project${projects.length - projectLeads.size !== 1 ? 's' : ''} without assigned leads`,
      ];

      confidence = computeConfidence(people.length, data.relationships.length, data.nodes.length);

      summary = `Team intelligence: ${people.length} tracked individual${people.length !== 1 ? 's' : ''} across ${roles.length} role${roles.length !== 1 ? 's' : ''}. ${linked.length} of ${people.length} are actively linked to projects. ${projects.length - projectLeads.size} project${projects.length - projectLeads.size !== 1 ? 's' : ''} lack an assigned lead.`;

      keyFindings = [
        ...people.map(p => {
          const theirProjects = data.relationships
            .filter(r => r.from === p.id && r.type === 'worksOn')
            .map(r => data.nodes.find(n => n.id === r.to)?.label)
            .filter(Boolean);
          const org = p.properties.organization ? ` @ ${p.properties.organization}` : '';
          return theirProjects.length > 0
            ? `${p.label} (${p.properties.role || 'no role'}${org}) → ${theirProjects.join(', ')}`
            : `${p.label} (${p.properties.role || 'no role'}${org}) — no project assignments`;
        }),
        people.length === 0 ? 'No Person entities in the ontology — add team members to unlock team intelligence' : null,
        projects.length > 0 && projectLeads.size < projects.length
          ? `⚠ ${projects.length - projectLeads.size} project${projects.length - projectLeads.size !== 1 ? 's' : ''} without assigned leads: ${projects.filter(p => !projectLeads.has(p.id)).map(p => p.label).join(', ')}`
          : null,
      ].filter(Boolean) as string[];

      recommendations = [
        people.length < 3 ? 'Add remaining team members as Person entities to complete the org view' : 'Team coverage looks solid — keep profiles current',
        'Link all people to active projects via "worksOn" relationships',
        people.length > 0 && people.some(p => !p.properties.email)
          ? 'Populate email/contact info for all team members to enable quick outreach'
          : 'Contact data looks complete — keep it current',
        'Model org structure using "reportsTo" relationships for accountability mapping',
      ];
      break;
    }

    // ── Projects ───────────────────────────────────────────────────────────
    case 'projects': {
      const byStatus = {
        active:   activeProjects,
        planning: projects.filter(p => p.properties.status === 'Planning'),
        paused:   projects.filter(p => p.properties.status === 'Paused'),
        done:     projects.filter(p => p.properties.status === 'Complete' || p.properties.status === 'Done'),
      };
      const highProgress  = projects.filter(p => Number(p.properties.progress) >= 70);
      const stalled       = projects.filter(p => p.properties.status === 'Active' && Number(p.properties.progress) < 20);

      tracedNodeIds = projects.map(p => p.id);
      tracedRelIds  = data.relationships
        .filter(r => projects.some(p => p.id === r.from || p.id === r.to))
        .map(r => r.id);
      dataPoints = [
        `${projects.length} total projects`,
        `${byStatus.active.length} active, ${byStatus.planning.length} planning, ${byStatus.done.length} complete`,
        `Portfolio average progress: ${avgProgress}%`,
        `Total budget: $${totalBudget.toLocaleString()} CAD`,
      ];

      confidence = computeConfidence(projects.length, data.relationships.length, data.nodes.length);

      summary = `Project portfolio: ${projects.length} total — ${byStatus.active.length} active, ${byStatus.planning.length} in planning${byStatus.done.length > 0 ? `, ${byStatus.done.length} complete` : ''}. Average completion: ${avgProgress}%. Total investment: $${totalBudget.toLocaleString()} CAD. ${stalled.length > 0 ? `${stalled.length} project${stalled.length !== 1 ? 's' : ''} appear stalled.` : 'No stalled projects detected.'}`;

      keyFindings = [
        ...projects.map(p => {
          const leads = data.relationships
            .filter(r => r.to === p.id && r.type === 'worksOn')
            .map(r => data.nodes.find(n => n.id === r.from)?.label)
            .filter(Boolean);
          const loc = data.relationships
            .filter(r => r.from === p.id && r.type === 'locatedAt')
            .map(r => data.nodes.find(n => n.id === r.to)?.label)
            .filter(Boolean)[0];
          return `${p.label}: ${p.properties.status} | ${p.properties.progress ?? '—'}% | $${Number(p.properties.budget || 0).toLocaleString()}${leads.length > 0 ? ` | Lead: ${leads.join(', ')}` : ' | ⚠ No lead'}${loc ? ` | ${loc}` : ''}`;
        }),
        highProgress.length > 0
          ? `On track (≥70%): ${highProgress.map(p => p.label).join(', ')}`
          : null,
        stalled.length > 0
          ? `⚠ Stalled (<20%): ${stalled.map(p => p.label).join(', ')} — immediate attention needed`
          : null,
      ].filter(Boolean) as string[];

      recommendations = [
        avgProgress < 40
          ? 'Portfolio below 40% average — consider scope reduction or resource injection'
          : 'Portfolio progress healthy — maintain delivery cadence',
        stalled.length > 0
          ? `Escalate stalled projects: ${stalled[0].label} needs immediate stakeholder review`
          : 'Set monthly milestone checkpoints for all active projects',
        'Ensure all projects have assigned leads via "worksOn" relationships',
        'Create "dependsOn" relationships between coupled projects to surface sequencing risks',
      ];

      analysisMetrics = projects.map(p => ({
        label: p.label,
        value: `${p.properties.progress ?? 0}%`,
        trend: Number(p.properties.progress) >= 70 ? 'up' : Number(p.properties.progress) < 20 ? 'down' : 'neutral',
      }));
      break;
    }

    // ── Location ───────────────────────────────────────────────────────────
    case 'location': {
      const linkedLocs = locations.flatMap(loc =>
        data.relationships
          .filter(r => r.to === loc.id && r.type === 'locatedAt')
          .map(r => ({ project: data.nodes.find(n => n.id === r.from), location: loc }))
      );
      const provinces = [...new Set(locations.map(l => l.properties.province).filter(Boolean))];
      const noCoords  = locations.filter(l => !l.properties.coordinates);

      tracedNodeIds = locations.map(l => l.id);
      tracedRelIds  = data.relationships
        .filter(r => r.type === 'locatedAt')
        .map(r => r.id);
      dataPoints = [
        `${locations.length} location${locations.length !== 1 ? 's' : ''} tracked`,
        `${provinces.length} province${provinces.length !== 1 ? 's' : ''}: ${provinces.join(', ') || 'unknown'}`,
        `${linkedLocs.length} project-location links established`,
        `${noCoords.length} location${noCoords.length !== 1 ? 's' : ''} missing coordinates`,
      ];

      confidence = computeConfidence(locations.length, data.relationships.length, data.nodes.length);

      summary = `Geographic intelligence: ${locations.length} location${locations.length !== 1 ? 's' : ''} across ${provinces.length} province${provinces.length !== 1 ? 's' : ''}. ${linkedLocs.length} project-location link${linkedLocs.length !== 1 ? 's' : ''} established. Primary region: ${provinces[0] ?? 'undefined'}. ${noCoords.length > 0 ? `${noCoords.length} location${noCoords.length !== 1 ? 's' : ''} missing geospatial coordinates.` : 'All locations have coordinates for geospatial view.'}`;

      keyFindings = [
        ...locations.map(loc => {
          const linked2 = data.relationships
            .filter(r => r.to === loc.id)
            .map(r => data.nodes.find(n => n.id === r.from)?.label)
            .filter(Boolean);
          const coords = loc.properties.coordinates;
          return `${loc.label} (${loc.properties.city ?? '?'}, ${loc.properties.province ?? '?'})${coords ? '' : ' ⚠ no coords'}: ${linked2.length > 0 ? linked2.join(', ') : 'no linked entities'}`;
        }),
        linkedLocs.length === 0
          ? '⚠ No project-location links exist — add "locatedAt" relationships'
          : null,
        provinces.length > 1
          ? `Multi-region presence: ${provinces.join(', ')}`
          : null,
      ].filter(Boolean) as string[];

      recommendations = [
        'Connect all projects to their primary location via "locatedAt" relationships',
        noCoords.length > 0
          ? `Add coordinates to: ${noCoords.map(l => l.label).join(', ')} to enable the Geospatial view`
          : 'All locations have coordinates — open Geospatial view for visual intelligence',
        locations.length < 2 ? 'Map additional office or partner locations' : 'Geographic coverage looks solid — keep location data current',
        'Use the Geospatial view to visually identify concentration risks',
      ];
      break;
    }

    // ── Opportunity ────────────────────────────────────────────────────────
    case 'opportunity': {
      const highBudget   = projects.filter(p => Number(p.properties.budget) > 30000);
      const upMetrics    = metrics.filter(m => m.properties.trend === 'up');
      const unlinkedLocs = locations.filter(
        l => !data.relationships.some(r => r.to === l.id && r.type === 'locatedAt')
      );
      const underservedProjects = projects.filter(
        p => p.properties.status === 'Active' && Number(p.properties.progress) >= 60
      );

      tracedNodeIds = [...projects.map(p => p.id), ...metrics.map(m => m.id), ...locations.map(l => l.id)];
      tracedRelIds  = data.relationships
        .filter(r => tracedNodeIds.includes(r.from) || tracedNodeIds.includes(r.to))
        .map(r => r.id);
      dataPoints = [
        `${upMetrics.length} metric${upMetrics.length !== 1 ? 's' : ''} trending upward`,
        `${highBudget.length} high-investment project${highBudget.length !== 1 ? 's' : ''} (>$30k)`,
        `${underservedProjects.length} project${underservedProjects.length !== 1 ? 's' : ''} near completion milestone`,
        `${unlinkedLocs.length} unleveraged location${unlinkedLocs.length !== 1 ? 's' : ''}`,
      ];

      confidence = computeConfidence(upMetrics.length + highBudget.length, data.relationships.length, data.nodes.length);

      summary = `Opportunity analysis: ${upMetrics.length} metric${upMetrics.length !== 1 ? 's' : ''} trending upward, ${highBudget.length} high-investment project${highBudget.length !== 1 ? 's' : ''} as strategic bets, ${underservedProjects.length} project${underservedProjects.length !== 1 ? 's' : ''} approaching completion milestone. ${locations.length} region${locations.length !== 1 ? 's' : ''} in coverage.`;

      keyFindings = [
        upMetrics.length > 0
          ? `Positive momentum: ${upMetrics.map(m => `${m.label} (${m.properties.value?.toLocaleString()} ${m.properties.unit ?? ''})`.trim()).join(', ')}`
          : 'No metrics showing upward trend — add tracking signals to surface opportunities',
        highBudget.length > 0
          ? `Strategic bets: ${highBudget.map(p => `${p.label} ($${Number(p.properties.budget).toLocaleString()})`).join(', ')}`
          : 'No high-budget projects identified yet — consider increasing investment in growth areas',
        underservedProjects.length > 0
          ? `Near completion: ${underservedProjects.map(p => `${p.label} (${p.properties.progress}%)`).join(', ')} — capitalize on momentum`
          : null,
        locations.length > 0
          ? `Geographic reach: ${[...new Set(locations.map(l => l.properties.province))].filter(Boolean).join(', ') || 'locations tracked'}`
          : 'No geographic presence mapped — location data could reveal expansion opportunities',
        `${insights.length} existing insight${insights.length !== 1 ? 's' : ''} in knowledge base — compound intelligence over time`,
      ].filter(Boolean) as string[];

      recommendations = [
        upMetrics.length > 0
          ? `Accelerate: double down on resources tied to ${upMetrics[0].label}`
          : 'Add revenue and growth metrics to surface momentum opportunities',
        'Map competitor or partner presence in current operating regions',
        underservedProjects.length > 0
          ? `Fast-track ${underservedProjects[0].label} to completion — ROI is imminent`
          : 'Identify and sequence the highest-ROI projects for prioritization',
        'Run "Connection Discovery" analysis to find untapped relationship opportunities',
      ];

      analysisMetrics = [
        { label: 'Upward Metrics', value: `${upMetrics.length}`,    trend: upMetrics.length > 0 ? 'up' : 'neutral' },
        { label: 'Strategic Bets', value: `${highBudget.length}`,   trend: 'neutral' },
        { label: 'Near Completion', value: `${underservedProjects.length}`, trend: underservedProjects.length > 0 ? 'up' : 'neutral' },
      ];
      break;
    }

    // ── Connection Discovery ───────────────────────────────────────────────
    case 'connection_discovery': {
      const isolated = data.nodes.filter(
        n => n.type !== 'Insight' && !data.relationships.some(r => r.from === n.id || r.to === n.id)
      );
      const hubNodes = data.nodes
        .map(n => ({
          node: n,
          degree: data.relationships.filter(r => r.from === n.id || r.to === n.id).length,
        }))
        .filter(({ degree }) => degree >= 3)
        .sort((a, b) => b.degree - a.degree);
      const missingLeads = projects.filter(
        p => !data.relationships.some(r => r.to === p.id && r.type === 'worksOn')
      );
      const relTypes = [...new Set(data.relationships.map(r => r.type))];

      tracedNodeIds = data.nodes.map(n => n.id);
      tracedRelIds  = data.relationships.map(r => r.id);
      dataPoints = [
        `${isolated.length} isolated entit${isolated.length !== 1 ? 'ies' : 'y'} with no relationships`,
        `${hubNodes.length} hub node${hubNodes.length !== 1 ? 's' : ''} with 3+ connections`,
        `${relTypes.length} relationship type${relTypes.length !== 1 ? 's' : ''} in use: ${relTypes.join(', ')}`,
        `Graph density: ${(data.relationships.length / Math.max(data.nodes.length, 1)).toFixed(2)} edges/node`,
      ];

      confidence = computeConfidence(data.nodes.length, data.relationships.length, data.nodes.length);

      summary = `Connection analysis across ${data.nodes.length} entities and ${data.relationships.length} relationship${data.relationships.length !== 1 ? 's' : ''}. ${isolated.length} isolated entit${isolated.length !== 1 ? 'ies' : 'y'} detected. ${hubNodes.length} hub node${hubNodes.length !== 1 ? 's' : ''} with high connectivity. Graph density: ${(data.relationships.length / Math.max(data.nodes.length, 1)).toFixed(2)} edges/node.`;

      keyFindings = [
        isolated.length > 0
          ? `⚠ Isolated (no connections): ${isolated.map(n => `${n.label} [${n.type}]`).slice(0, 4).join(', ')}${isolated.length > 4 ? ` +${isolated.length - 4} more` : ''}`
          : 'All entities are connected — strong graph integrity',
        hubNodes.length > 0
          ? `Network hubs: ${hubNodes.slice(0, 3).map(({ node, degree }) => `${node.label} (${degree} links)`).join(', ')}`
          : 'No dominant hub nodes — graph is relatively flat',
        missingLeads.length > 0
          ? `⚠ Projects without leads: ${missingLeads.map(p => p.label).join(', ')} — add "worksOn" relationships`
          : 'All projects have assigned leads',
        `Relationship types in use: ${relTypes.join(', ')}`,
        people.length > 0 && projects.length > 0
          ? `Person-project connections: ${data.relationships.filter(r => r.type === 'worksOn').length} "worksOn" links across ${people.length} people`
          : null,
      ].filter(Boolean) as string[];

      recommendations = [
        isolated.length > 0
          ? `Connect isolated entities: start with ${isolated[0].label} — add at least one relationship`
          : 'Graph is well-connected — focus on relationship quality',
        'Add "dependsOn" between projects to model sequencing and risk propagation',
        'Use "reportsTo" between people to build an org chart in the graph',
        missingLeads.length > 0
          ? `Assign leads to ${missingLeads[0].label} using a "worksOn" relationship`
          : 'Audit relationship types to ensure semantic consistency',
      ];

      analysisMetrics = [
        { label: 'Total Entities',  value: `${data.nodes.length}`,         trend: 'neutral' },
        { label: 'Relationships',   value: `${data.relationships.length}`,  trend: data.relationships.length > 5 ? 'up' : 'neutral' },
        { label: 'Isolated Nodes',  value: `${isolated.length}`,            trend: isolated.length > 0 ? 'down' : 'up' },
        { label: 'Graph Density',   value: `${(data.relationships.length / Math.max(data.nodes.length, 1)).toFixed(1)}x`, trend: 'neutral' },
      ];
      break;
    }

    // ── Scenario Projection ────────────────────────────────────────────────
    case 'scenario_projection': {
      const upMetrics     = metrics.filter(m => m.properties.trend === 'up');
      const downMetrics   = metrics.filter(m => m.properties.trend === 'down');
      const activeCount   = activeProjects.length;
      const planningCount = projects.filter(p => p.properties.status === 'Planning').length;
      const projectedBurn = totalBudget > 0
        ? Math.round(totalBudget * (1 - avgProgress / 100))
        : 0;

      tracedNodeIds = [...projects.map(p => p.id), ...metrics.map(m => m.id)];
      tracedRelIds  = data.relationships.map(r => r.id);
      dataPoints = [
        `${upMetrics.length} metric${upMetrics.length !== 1 ? 's' : ''} on upward trajectory`,
        `${downMetrics.length} metric${downMetrics.length !== 1 ? 's' : ''} on downward trajectory`,
        `${planningCount} project${planningCount !== 1 ? 's' : ''} entering active phase soon`,
        `Remaining budget at current progress: $${projectedBurn.toLocaleString()}`,
      ];

      confidence = computeConfidence(metrics.length + projects.length, data.relationships.length, data.nodes.length);

      summary = `Scenario projection based on ${data.nodes.length} entities and current trends. ${upMetrics.length > 0 ? `${upMetrics.length} metric${upMetrics.length !== 1 ? 's' : ''} on upward trajectory.` : 'No upward metric trends detected.'} ${planningCount} project${planningCount !== 1 ? 's' : ''} entering execution phase, adding ${planningCount > 0 ? 'new delivery pressure' : 'no new pressure'}. Estimated remaining budget: $${projectedBurn.toLocaleString()}.`;

      keyFindings = [
        upMetrics.length > 0
          ? `Upside scenario: ${upMetrics.map(m => m.label).join(', ')} continuing upward — compound effect possible`
          : 'Baseline scenario: no strong positive signals in current metrics',
        downMetrics.length > 0
          ? `⚠ Downside risk: ${downMetrics.map(m => m.label).join(', ')} declining — course correction needed`
          : 'No declining metrics detected — baseline holding',
        planningCount > 0
          ? `${planningCount} project${planningCount !== 1 ? 's' : ''} (${projects.filter(p => p.properties.status === 'Planning').map(p => p.label).join(', ')}) will enter execution, increasing resource demand`
          : 'No projects transitioning from planning to active',
        projectedBurn > 0
          ? `Remaining budget at ${avgProgress}% avg progress: $${projectedBurn.toLocaleString()} — runway dependent on delivery pace`
          : 'Budget runway unclear — add budget and progress data to projects',
        activeCount > 2
          ? `${activeCount} simultaneous active projects — team capacity may be a constraint`
          : null,
      ].filter(Boolean) as string[];

      recommendations = [
        upMetrics.length > 0
          ? `Capitalize on ${upMetrics[0].label} trend — align project roadmap to this momentum`
          : 'Establish baseline metrics to enable future projections',
        downMetrics.length > 0
          ? `Intervention needed for ${downMetrics[0].label} — investigate root cause this week`
          : 'Maintain current trajectory — run this analysis monthly to detect changes',
        planningCount > 0
          ? 'Plan resource allocation now for projects entering execution next quarter'
          : 'Explore pipeline — what new projects should enter planning?',
        'Add target/goal properties to Metric nodes to enable variance tracking',
      ];

      analysisMetrics = [
        { label: 'Upward Trends',   value: `${upMetrics.length}`,    trend: upMetrics.length > 0 ? 'up' : 'neutral' },
        { label: 'Downward Trends', value: `${downMetrics.length}`,  trend: downMetrics.length > 0 ? 'down' : 'neutral' },
        { label: 'Incoming Active', value: `${planningCount}`,       trend: planningCount > 2 ? 'down' : 'neutral' },
        { label: 'Remaining Budget', value: projectedBurn > 0 ? `$${(projectedBurn / 1000).toFixed(0)}k` : '—', trend: 'neutral' },
      ];
      break;
    }

    // ── Summary ────────────────────────────────────────────────────────────
    case 'summary': {
      const categories = [...new Set(data.nodes.map(n => n.type))];
      const density    = (data.relationships.length / Math.max(data.nodes.length, 1)).toFixed(1);
      const topMetric  = metrics[0];

      tracedNodeIds = data.nodes.map(n => n.id);
      tracedRelIds  = data.relationships.map(r => r.id);
      dataPoints = [
        `${data.nodes.length} entities across ${categories.length} type${categories.length !== 1 ? 's' : ''}`,
        `${data.relationships.length} relationships (${density} avg per entity)`,
        `${activeProjects.length} active project${activeProjects.length !== 1 ? 's' : ''}`,
        `${insights.length} saved analysis${insights.length !== 1 ? 'es' : ''}`,
      ];

      confidence = computeConfidence(data.nodes.length, data.relationships.length, data.nodes.length);

      summary = `Full intelligence snapshot: ${data.nodes.length} entities across ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}. ${data.relationships.length} relationship${data.relationships.length !== 1 ? 's' : ''} mapped (${density} avg/entity). ${activeProjects.length} active project${activeProjects.length !== 1 ? 's' : ''}, ${people.length} team member${people.length !== 1 ? 's' : ''}, ${metrics.length} metric${metrics.length !== 1 ? 's' : ''}. Ontology health: ${Number(density) >= 1.5 ? 'strong' : Number(density) >= 0.8 ? 'developing' : 'sparse'}.`;

      keyFindings = [
        `Entity breakdown: ${people.length} people, ${projects.length} projects, ${locations.length} locations, ${metrics.length} metrics${insights.length > 0 ? `, ${insights.length} insights` : ''}`,
        `Graph connectivity: ${data.relationships.length} relationships — ${Number(density) >= 1.5 ? 'healthy density' : 'graph is sparse, add more connections'}`,
        activeProjects.length > 0
          ? `Active work: ${activeProjects.map(p => `${p.label} (${p.properties.progress ?? '?'}%)`).join(', ')}`
          : 'No active projects — consider activating planning-phase work',
        topMetric
          ? `Top signal: ${topMetric.label} — ${Number(topMetric.properties.value).toLocaleString()} ${topMetric.properties.unit ?? ''} (${topMetric.properties.trend ?? 'stable'})`
          : 'No metrics tracked — add Metric entities to surface key signals',
        `${insights.length} insight${insights.length !== 1 ? 's' : ''} in knowledge base — ${insights.length < 3 ? 'run more analyses to build intelligence' : 'rich knowledge base'}`,
      ].filter(Boolean) as string[];

      recommendations = [
        data.nodes.length < 10
          ? 'Ontology is sparse — add more entities (people, projects, metrics) for richer intelligence'
          : 'Good entity coverage — focus on relationship quality over quantity',
        Number(density) < 1
          ? 'Graph is underdeveloped — create more connections between entities to unlock deeper insights'
          : 'Relationship density looks healthy — maintain and refine',
        insights.length === 0
          ? 'Run financial, risk, and team analyses to build your insight library'
          : 'Continue building the insight library — compound intelligence improves accuracy',
        'Schedule quarterly ontology reviews to keep all data current and relevant',
      ];

      analysisMetrics = [
        { label: 'Total Entities',  value: `${data.nodes.length}`,          trend: data.nodes.length > 10 ? 'up' : 'neutral' },
        { label: 'Relationships',   value: `${data.relationships.length}`,   trend: data.relationships.length > 8 ? 'up' : 'neutral' },
        { label: 'Active Projects', value: `${activeProjects.length}`,       trend: 'neutral' },
        { label: 'Avg Progress',    value: `${avgProgress}%`,                trend: avgProgress > 50 ? 'up' : 'neutral' },
      ];
      break;
    }

    // ── Generic search ─────────────────────────────────────────────────────
    default: {
      tracedNodeIds = matched.map(n => n.id);
      tracedRelIds  = data.relationships
        .filter(r => matched.some(n => n.id === r.from || n.id === r.to))
        .map(r => r.id);
      dataPoints = [
        `Full-text search across ${data.nodes.length} entities`,
        `${matched.length} match${matched.length !== 1 ? 'es' : ''} found for "${query}"`,
      ];

      confidence = computeConfidence(matched.length, data.relationships.length, data.nodes.length);

      summary = matched.length > 0
        ? `Found ${matched.length} entit${matched.length !== 1 ? 'ies' : 'y'} matching "${query}": ${matched.map(n => `${n.label} (${n.type})`).slice(0, 3).join(', ')}${matched.length > 3 ? ` and ${matched.length - 3} more` : ''}.`
        : `No direct matches for "${query}" in the ontology. Try an intent-based query or broaden your search.`;

      keyFindings = matched.slice(0, 5).map(n => {
        const top = Object.entries(n.properties).find(([, v]) => typeof v !== 'object');
        return `${n.label} [${n.type}]${top ? ` — ${top[0]}: ${top[1]}` : ''}`;
      });

      recommendations = matched.length > 0
        ? [
          'Click any matched entity to open its detail panel',
          'Create relationships between matching entities to deepen context',
          matched.length > 5 ? 'Narrow your query to focus on specific entity types' : 'Add more properties to improve future search precision',
          'Try intent-based queries: "financial overview", "team status", "risks", "summary"',
        ]
        : [
          'Try searching by type: "projects", "people", "locations", "metrics"',
          'Use intent-based queries: "financial overview", "team status", "risks"',
          'Try "connection discovery" to see relationship gaps',
          'Browse the Entities view for a full inventory',
        ];
    }
  }

  return {
    intent,
    confidence: confidence!.label,
    confidenceScore: confidence!.score,
    summary,
    keyFindings:     keyFindings.slice(0, 6),
    recommendations: recommendations.slice(0, 4),
    relatedNodeIds:  [...new Set([...matched.map(n => n.id), ...tracedNodeIds])],
    metrics: analysisMetrics.length ? analysisMetrics : undefined,
    reasoningTrace: {
      nodesAnalyzed: [...new Set(tracedNodeIds)],
      relsAnalyzed:  [...new Set(tracedRelIds)],
      dataPoints,
    },
  };
}

// ─── Auto-insights for dashboard ──────────────────────────────────────────────

export function generateAutoInsights(data: AetherData): AutoInsight[] {
  const insights: AutoInsight[] = [];

  const projects  = data.nodes.filter(n => n.type === 'Project');
  const people    = data.nodes.filter(n => n.type === 'Person');
  const metrics   = data.nodes.filter(n => n.type === 'Metric');
  const locations = data.nodes.filter(n => n.type === 'Location');

  // Risk: low-progress active projects
  const lowProgress = projects.filter(
    p => p.properties.status === 'Active' && Number(p.properties.progress) < 40
  );
  if (lowProgress.length > 0) {
    insights.push({
      id: 'auto-risk-progress',
      title: `${lowProgress.length} delivery risk${lowProgress.length !== 1 ? 's' : ''} detected`,
      description: `${lowProgress.map(p => p.label).join(', ')} ${lowProgress.length === 1 ? 'is' : 'are'} active with below-threshold progress.`,
      severity: 'risk',
      intent: 'risk',
      query: 'risk assessment',
    });
  }

  // Opportunity: upward-trending metrics
  const upMetrics = metrics.filter(m => m.properties.trend === 'up');
  if (upMetrics.length > 0) {
    insights.push({
      id: 'auto-opportunity-metrics',
      title: `${upMetrics.length} metric${upMetrics.length !== 1 ? 's' : ''} trending up`,
      description: `${upMetrics.map(m => m.label).join(', ')} showing positive momentum.`,
      severity: 'opportunity',
      intent: 'opportunity',
      query: 'opportunity analysis',
    });
  }

  // Info: geographic coverage
  if (locations.length > 0) {
    const provinces = [...new Set(locations.map(l => l.properties.province).filter(Boolean))];
    insights.push({
      id: 'auto-location',
      title: provinces.length > 0 ? `${provinces.join(' · ')} presence` : `${locations.length} location${locations.length !== 1 ? 's' : ''} mapped`,
      description: `Operations tracked across ${locations.length} location${locations.length !== 1 ? 's' : ''}${provinces.length > 0 ? ` in ${provinces.join(', ')}` : ''}.`,
      severity: 'info',
      intent: 'location',
      query: 'location overview',
    });
  }

  // Risk: isolated (unconnected) team members
  const isolatedPeople = people.filter(
    p => !data.relationships.some(r => r.from === p.id || r.to === p.id)
  );
  if (isolatedPeople.length > 0) {
    insights.push({
      id: 'auto-team-isolated',
      title: `${isolatedPeople.length} team member${isolatedPeople.length !== 1 ? 's' : ''} unconnected`,
      description: `${isolatedPeople.map(p => p.label).join(', ')} ${isolatedPeople.length === 1 ? 'has' : 'have'} no relationships in the graph.`,
      severity: 'risk',
      intent: 'team',
      query: 'team overview',
    });
  }

  // Opportunity: projects near completion
  const nearDone = projects.filter(
    p => p.properties.status === 'Active' && Number(p.properties.progress) >= 70
  );
  if (nearDone.length > 0) {
    insights.push({
      id: 'auto-opportunity-near-done',
      title: `${nearDone.length} project${nearDone.length !== 1 ? 's' : ''} near completion`,
      description: `${nearDone.map(p => `${p.label} (${p.properties.progress}%)`).join(', ')} ready to close.`,
      severity: 'opportunity',
      intent: 'projects',
      query: 'project portfolio status',
    });
  }

  // Return top 3, prioritizing risks then opportunities then info
  return insights
    .sort((a, b) => {
      const order: Record<AutoInsight['severity'], number> = { risk: 0, opportunity: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 3);
}

// ─── Random insight ───────────────────────────────────────────────────────────

/**
 * Intelligently selects an analysis query based on what data is actually present.
 * Each candidate is weighted — data-rich angles are preferred over generic ones.
 * Returns a query string; pass it to setSearchQuery() and the AI panel auto-fires.
 */
export function getRandomInsight(data: AetherData): string {
  const types = new Set(data.nodes.map(n => n.type));

  // [weight, query] — higher weight = more likely to be selected
  const pool: [number, string][] = [
    // Always available (lower weight so specific insights win when data is rich)
    [2, 'connection discovery'],
    [2, 'full summary overview'],
    [2, 'opportunity analysis'],
    [2, 'scenario projection forecast'],
  ];

  if (types.has('Person')) {
    pool.push(
      [4, 'team overview'],
      [3, 'key person dependencies'],
      [2, 'org coverage and role gaps'],
    );
  }

  if (types.has('Project')) {
    pool.push(
      [4, 'project portfolio status'],
      [4, 'risk assessment'],
      [3, 'delivery health overview'],
    );
  }

  if (types.has('Metric')) {
    pool.push(
      [4, 'financial overview'],
      [3, 'performance metrics analysis'],
    );
  }

  if (types.has('Location')) {
    pool.push(
      [3, 'location overview'],
      [2, 'geospatial distribution'],
    );
  }

  if (types.has('Event')) {
    pool.push([3, 'upcoming events and milestones']);
  }

  // Cross-type combos — most interesting when both sides exist
  if (types.has('Person') && types.has('Project')) {
    pool.push([5, 'who is working on what']);
  }

  if (types.has('Project') && types.has('Metric')) {
    pool.push([5, 'project financial health']);
  }

  if (types.has('Person') && types.has('Location')) {
    pool.push([4, 'team geographic spread']);
  }

  if (types.has('Person') && types.has('Project') && types.has('Metric')) {
    pool.push([5, 'executive overview']);
  }

  // Weighted random selection
  const total = pool.reduce((sum, [w]) => sum + w, 0);
  let rand = Math.random() * total;
  for (const [weight, query] of pool) {
    rand -= weight;
    if (rand <= 0) return query;
  }
  return pool[pool.length - 1][1];
}

// ─── Node factory ─────────────────────────────────────────────────────────────

export function createInsightNode(query: string, analysis: AnalysisResult): OntologyNode {
  const label = query.length > 40 ? `${query.slice(0, 40)}…` : query;
  return {
    id: `insight-${Date.now()}`,
    type: 'Insight',
    label: `Analysis: ${label}`,
    properties: {
      summary:         analysis.summary,
      keyFindings:     analysis.keyFindings,
      recommendations: analysis.recommendations,
      intent:          analysis.intent,
      confidence:      analysis.confidence,
      confidenceScore: analysis.confidenceScore,
      query,
      analyzedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString().split('T')[0],
  };
}
