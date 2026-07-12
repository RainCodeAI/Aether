import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import type { AnalysisResult, AnalysisIntent } from '@/lib/ai-search';
import { detectIntent } from '@/lib/ai-search';
import {
  selectAnalysisContext,
  serializeContextForPrompt,
} from '@/lib/ai-context';
import type { AetherData } from '@/types';

const SYSTEM_PROMPT = `You are an intelligence analyst for Aether, a personal knowledge OS. You receive a user query and a JSON snapshot of their ontology graph (often a relevance-ranked subgraph), then return structured analysis as JSON.

The ontology contains nodes (entities) of these types: Person, Project, Location, Metric, Insight, Event, Document.
Each node has: id, type, label, createdAt, properties (varies by type), tags[].
Relationships have: id, type, from (node id), to (node id).

The payload may include selectionNote describing how the subgraph was chosen. Base answers only on the provided nodes/relationships; if context looks truncated, say so when confidence is limited.

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
- confidenceScore: reflect how much relevant data exists (sparse or truncated graph = lower score).
- relatedNodeIds: ids of nodes most relevant to the answer.
- reasoningTrace.dataPoints: 3-5 plain-English statements describing what you examined.
- Do not include markdown, only JSON.`;

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
  const selection = selectAnalysisContext(context.data, query, intent, {
    maxNodes: 40,
    maxRels: 80,
    expandNeighbors: true,
  });
  const graphSummary = serializeContextForPrompt(selection);

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
      intent: (parsed.intent as AnalysisIntent) ?? intent,
      confidence: parsed.confidence ?? 'medium',
      confidenceScore: parsed.confidenceScore ?? 50,
      summary: parsed.summary ?? '',
      keyFindings: parsed.keyFindings ?? [],
      recommendations: parsed.recommendations ?? [],
      relatedNodeIds: parsed.relatedNodeIds ?? selection.selectedNodeIds.slice(0, 8),
      metrics: parsed.metrics,
      reasoningTrace: parsed.reasoningTrace ?? {
        nodesAnalyzed: selection.selectedNodeIds.slice(0, 12),
        relsAnalyzed: selection.data.relationships.map((r) => r.id).slice(0, 12),
        dataPoints: [selection.selectionNote],
      },
    };

    // Ensure trace mentions selection when model omits it
    if (
      selection.truncated &&
      result.reasoningTrace &&
      !result.reasoningTrace.dataPoints.some((d) =>
        d.toLowerCase().includes('subgraph') || d.toLowerCase().includes('ranked')
      )
    ) {
      result.reasoningTrace = {
        ...result.reasoningTrace,
        dataPoints: [selection.selectionNote, ...result.reasoningTrace.dataPoints].slice(0, 6),
      };
    }

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 502 });
  }
}
