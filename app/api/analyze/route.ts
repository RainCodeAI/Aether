import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import type { AnalysisResult, AnalysisIntent } from '@/lib/ai-search';
import { detectIntent } from '@/lib/ai-search';
import type { AetherData } from '@/types';

const SYSTEM_PROMPT = `You are an intelligence analyst for Aether, a personal knowledge OS. You receive a user query and a JSON snapshot of their ontology graph, then return structured analysis as JSON.

The ontology contains nodes (entities) of these types: Person, Project, Location, Metric, Insight, Event, Document.
Each node has: id, type, label, createdAt, properties (varies by type), tags[].
Relationships have: id, type, from (node id), to (node id), label.

Your response MUST be valid JSON matching this exact shape:
{
  "intent": "<financial|risk|team|projects|location|opportunity|summary|connection_discovery|scenario_projection|search>",
  "confidence": "<high|medium|low>",
  "confidenceScore": <0-100>,
  "summary": "<2-3 sentence executive summary>",
  "keyFindings": ["<finding 1>", "<finding 2>", ...],
  "recommendations": ["<action 1>", "<action 2>", ...],
  "relatedNodeIds": ["<node id>", ...],
  "metrics": [{"label": "<name>", "value": "<value>", "trend": "<up|down|neutral>"}],
  "reasoningTrace": {
    "nodesAnalyzed": ["<node id>", ...],
    "relsAnalyzed": ["<rel id>", ...],
    "dataPoints": ["<human-readable explanation>", ...]
  }
}

Rules:
- keyFindings: 3-6 specific, data-grounded observations. Use ⚠ prefix for risks.
- recommendations: 3-4 concrete, actionable next steps.
- metrics: only include when numerically relevant (financial, projects, risk). Omit the field if not applicable.
- confidenceScore: reflect how much relevant data exists (sparse graph = lower score).
- relatedNodeIds: ids of nodes most relevant to the answer.
- reasoningTrace.dataPoints: 3-5 plain-English statements describing what you examined.
- Do not include markdown, only JSON.`;

function buildContextSummary(data: AetherData, intent: AnalysisIntent): string {
  const nodes = data.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    label: n.label,
    createdAt: n.createdAt,
    properties: n.properties,
    tags: n.tags ?? [],
  }));

  const rels = data.relationships.map((r) => ({
    id: r.id,
    type: r.type,
    from: r.from,
    to: r.to,
  }));

  // Focus the context based on intent to keep token count manageable
  const intentNodeTypes: Record<AnalysisIntent, string[]> = {
    financial:            ['Project', 'Metric'],
    risk:                 ['Project', 'Person'],
    team:                 ['Person', 'Project'],
    projects:             ['Project'],
    location:             ['Location', 'Project'],
    opportunity:          ['Metric', 'Project', 'Location'],
    summary:              [],          // all types
    connection_discovery: [],          // all types
    scenario_projection:  ['Metric', 'Project'],
    search:               [],          // all types
  };

  const focusTypes = intentNodeTypes[intent];
  const relevantNodes = focusTypes.length === 0
    ? nodes
    : nodes.filter((n) => focusTypes.includes(n.type));

  return JSON.stringify({ nodes: relevantNodes, relationships: rels }, null, 0);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
  }

  let body: { query: string; context: { data: AetherData } };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query, context } = body;
  if (!query || !context?.data) {
    return Response.json({ error: 'Missing query or context.data' }, { status: 400 });
  }

  const intent = detectIntent(query);
  const graphSummary = buildContextSummary(context.data, intent);

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      max_tokens: 1200,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Query: "${query}"\n\nOntology graph:\n${graphSummary}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as Partial<AnalysisResult>;

    // Ensure required fields are present with safe defaults
    const result: AnalysisResult = {
      intent:           (parsed.intent as AnalysisIntent) ?? intent,
      confidence:       parsed.confidence ?? 'medium',
      confidenceScore:  parsed.confidenceScore ?? 50,
      summary:          parsed.summary ?? '',
      keyFindings:      parsed.keyFindings ?? [],
      recommendations:  parsed.recommendations ?? [],
      relatedNodeIds:   parsed.relatedNodeIds ?? [],
      metrics:          parsed.metrics,
      reasoningTrace:   parsed.reasoningTrace ?? { nodesAnalyzed: [], relsAnalyzed: [], dataPoints: [] },
    };

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 502 });
  }
}
