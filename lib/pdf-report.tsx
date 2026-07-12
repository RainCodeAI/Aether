// lib/pdf-report.tsx
import React from 'react';
import {
  Document, Page, Text, View, Image, StyleSheet,
} from '@react-pdf/renderer';
import { AetherData, OntologyNode } from '@/types';
import { SavedInsight } from './ai-search';

export type ReportTemplate =
  | 'executive-summary'
  | 'full-ontology'
  | 'project-deep-dive'
  | 'risk-assessment'
  | 'geospatial-overview';

export interface ReportOptions {
  template: ReportTemplate;
  title: string;
  includeGraph: boolean;
  includeTimeline: boolean;
  selectedEntityIds: string[];
  data: AetherData;
  savedInsights: SavedInsight[];
  graphScreenshot?: string;
  focusNodeId?: string;
}

// ─── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  dark:       '#0A0A0C',
  text:       '#1E293B',
  muted:      '#64748B',
  subtle:     '#94A3B8',
  line:       '#E2E8F0',
  surface:    '#F8FAFC',
  cyan:       '#06B6D4',
  cyanLight:  '#ECFEFF',
  emerald:    '#10B981',
  purple:     '#7C3AED',
  amber:      '#D97706',
  rose:       '#E11D48',
  orange:     '#EA580C',
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Person:   { bg: '#ECFEFF', text: '#0E7490' },
  Project:  { bg: '#F5F3FF', text: T.purple  },
  Location: { bg: '#F0FDF4', text: '#15803D' },
  Metric:   { bg: '#FFFBEB', text: T.amber   },
  Insight:  { bg: '#FFF1F2', text: '#BE123C' },
  Event:    { bg: '#FFF7ED', text: T.orange  },
  Document: { bg: T.surface, text: '#475569' },
};

// ─── StyleSheet ────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    color: T.text,
    paddingBottom: 56,
  },
  // Header
  header: {
    backgroundColor: T.dark,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 28,
  },
  accentBar: {
    height: 3,
    width: 48,
    backgroundColor: T.cyan,
    borderRadius: 2,
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  headerMeta: {
    fontSize: 9,
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  headerBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 7,
    color: T.cyan,
    letterSpacing: 1.2,
    fontFamily: 'Helvetica',
  },
  // Body
  body: {
    paddingHorizontal: 40,
    paddingTop: 28,
  },
  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: T.subtle,
    letterSpacing: 1.8,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    borderBottomStyle: 'solid',
  },
  // Summary box
  summaryBox: {
    backgroundColor: T.cyanLight,
    borderLeftWidth: 3,
    borderLeftColor: T.cyan,
    borderLeftStyle: 'solid',
    borderRadius: 4,
    padding: 14,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.75,
    color: '#0F172A',
  },
  // Stats bar
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  statNum: {
    fontSize: 20,
    fontFamily: 'Courier-Bold',
    color: T.cyan,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 7,
    color: T.muted,
    letterSpacing: 0.8,
  },
  // Entity card
  entityCard: {
    borderWidth: 1,
    borderColor: T.line,
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 12,
    marginBottom: 7,
    flexDirection: 'row',
  },
  entityBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    marginRight: 10,
    marginTop: 1,
    height: 18,
    minWidth: 52,
    textAlign: 'center',
  },
  entityLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: T.text,
    marginBottom: 3,
  },
  entityProp: {
    fontSize: 8.5,
    color: T.muted,
    marginBottom: 1.5,
  },
  entityConns: {
    fontSize: 8,
    color: T.cyan,
    marginTop: 2,
  },
  entityDate: {
    fontSize: 7.5,
    color: T.subtle,
    marginTop: 3,
  },
  // Findings / bullets
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 7,
  },
  bulletMark: {
    fontSize: 9,
    width: 14,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 9.5,
    lineHeight: 1.6,
    flex: 1,
    color: T.text,
  },
  // Relationship rows
  relRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    borderBottomStyle: 'solid',
  },
  relFrom: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
    color: T.text,
  },
  relType: {
    fontSize: 7.5,
    color: T.cyan,
    fontFamily: 'Courier',
    backgroundColor: T.cyanLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginHorizontal: 8,
  },
  relTo: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
    color: T.text,
    textAlign: 'right',
  },
  // Metrics grid
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricChip: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderStyle: 'solid',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 90,
  },
  metricLabel: {
    fontSize: 7.5,
    color: T.muted,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: 'Courier-Bold',
    color: T.emerald,
  },
  metricUnit: {
    fontSize: 7,
    color: T.muted,
  },
  // Graph image
  graphImage: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.line,
    borderStyle: 'solid',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.line,
    borderTopStyle: 'solid',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 7.5,
    color: T.muted,
    fontFamily: 'Courier',
  },
  footerPageNum: {
    fontSize: 7.5,
    color: T.subtle,
    fontFamily: 'Courier',
  },
  footerConfidential: {
    fontSize: 7.5,
    color: '#CBD5E1',
  },
});

// ─── Template label map ────────────────────────────────────────────────────────

const TEMPLATE_LABEL: Record<ReportTemplate, string> = {
  'executive-summary':   'EXECUTIVE SUMMARY',
  'full-ontology':       'FULL ONTOLOGY',
  'project-deep-dive':   'PROJECT DEEP DIVE',
  'risk-assessment':     'RISK ASSESSMENT',
  'geospatial-overview': 'GEOSPATIAL OVERVIEW',
};

// ─── Shared components ─────────────────────────────────────────────────────────

function ReportHeader({ title, template, date }: { title: string; template: ReportTemplate; date: string }) {
  return (
    <View style={S.header}>
      <View style={S.accentBar} />
      <Text style={S.headerTitle}>{title}</Text>
      <View style={S.headerRow}>
        <Text style={S.headerMeta}>Generated {date} · Aether Intelligence OS</Text>
        <Text style={S.headerBadge}>{TEMPLATE_LABEL[template]}</Text>
      </View>
    </View>
  );
}

function ReportFooter({ title }: { title: string }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>AETHER · {title.toUpperCase().slice(0, 40)}</Text>
      <Text style={S.footerPageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      <Text style={S.footerConfidential}>CONFIDENTIAL</Text>
    </View>
  );
}

function StatsBar({ data }: { data: AetherData }) {
  const stats = [
    { n: data.nodes.length,                                    label: 'Entities'      },
    { n: data.relationships.length,                            label: 'Relationships' },
    { n: data.nodes.filter(n => n.type === 'Project').length,  label: 'Projects'      },
    { n: data.nodes.filter(n => n.type === 'Person').length,   label: 'People'        },
    { n: data.nodes.filter(n => n.type === 'Metric').length,   label: 'Metrics'       },
  ];
  return (
    <View style={S.statsRow}>
      {stats.map(({ n, label }, i) => (
        <View key={label} style={[S.statBox, i === stats.length - 1 ? { marginRight: 0 } : {}]}>
          <Text style={S.statNum}>{n}</Text>
          <Text style={S.statLabel}>{label.toUpperCase()}</Text>
        </View>
      ))}
    </View>
  );
}

function EntityCard({ node, data }: { node: OntologyNode; data: AetherData }) {
  const colors = TYPE_COLORS[node.type] ?? TYPE_COLORS.Document;
  const conns  = data.relationships.filter(r => r.from === node.id || r.to === node.id).length;
  const props  = Object.entries(node.properties)
    .filter(([k]) => !['source', 'analyzedAt', 'confidenceScore', 'keyFindings', 'recommendations', 'summary'].includes(k))
    .slice(0, 4);
  return (
    <View style={S.entityCard}>
      <View style={[S.entityBadge, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text }}>{node.type.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={S.entityLabel}>{node.label}</Text>
        {props.map(([k, v]) => (
          <Text key={k} style={S.entityProp}>
            {k.replace(/_/g, ' ')}: {formatVal(v)}
          </Text>
        ))}
        {conns > 0 && (
          <Text style={S.entityConns}>{conns} connection{conns !== 1 ? 's' : ''}</Text>
        )}
      </View>
      {node.createdAt && (
        <Text style={S.entityDate}>{new Date(node.createdAt).toLocaleDateString()}</Text>
      )}
    </View>
  );
}

function Bullets({ items, color = T.cyan, mark = '◆' }: { items: string[]; color?: string; mark?: string }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={S.bulletRow}>
          <Text style={[S.bulletMark, { color }]}>{mark}</Text>
          <Text style={S.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function RelTable({ data, limit = 25 }: { data: AetherData; limit?: number }) {
  return (
    <View>
      {data.relationships.slice(0, limit).map((r) => {
        const from = data.nodes.find(n => n.id === r.from);
        const to   = data.nodes.find(n => n.id === r.to);
        if (!from || !to) return null;
        return (
          <View key={r.id} style={S.relRow}>
            <Text style={S.relFrom}>{from.label}</Text>
            <Text style={S.relType}>{r.type}</Text>
            <Text style={S.relTo}>{to.label}</Text>
          </View>
        );
      })}
      {data.relationships.length > limit && (
        <Text style={{ fontSize: 7.5, color: T.muted, marginTop: 5 }}>
          + {data.relationships.length - limit} more relationships
        </Text>
      )}
    </View>
  );
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if ('lat' in obj && 'lng' in obj) return `${Number(obj.lat).toFixed(4)}°, ${Number(obj.lng).toFixed(4)}°`;
    return JSON.stringify(v);
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return v.toLocaleString();
  return String(v);
}

// ─── Template builders ─────────────────────────────────────────────────────────

function buildExecutiveSummary(opts: ReportOptions): React.ReactElement {
  const { data, title, template, graphScreenshot, savedInsights } = opts;
  const date     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const projects = data.nodes.filter(n => n.type === 'Project');
  const riskItems = data.nodes.filter(n => n.properties.status === 'At Risk');
  const latest   = savedInsights[0];

  const summaryText = latest?.result.summary
    ?? `This intelligence report provides a comprehensive overview of ${data.nodes.length} entities and ${data.relationships.length} relationships tracked in Aether. The ontology spans ${projects.length} project${projects.length !== 1 ? 's' : ''}, ${data.nodes.filter(n => n.type === 'Person').length} people, ${data.nodes.filter(n => n.type === 'Location').length} locations, and ${data.nodes.filter(n => n.type === 'Metric').length} key metrics.${riskItems.length > 0 ? ` ${riskItems.length} item${riskItems.length !== 1 ? 's' : ''} flagged as at-risk require immediate attention.` : ' No critical risks identified at this time.'}`;

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <ReportHeader title={title} template={template} date={date} />
        <ReportFooter title={title} />
        <View style={S.body}>
          <StatsBar data={data} />

          <View style={S.section}>
            <Text style={S.sectionTitle}>EXECUTIVE SUMMARY</Text>
            <View style={S.summaryBox}>
              <Text style={S.summaryText}>{summaryText}</Text>
            </View>
          </View>

          {graphScreenshot && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>INTELLIGENCE GRAPH</Text>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is a PDF primitive, not a DOM img */}
              <Image src={graphScreenshot} style={S.graphImage} />
            </View>
          )}

          {projects.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>ACTIVE PROJECTS ({projects.length})</Text>
              {projects.slice(0, 5).map(n => <EntityCard key={n.id} node={n} data={data} />)}
            </View>
          )}

          {riskItems.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>RISK INDICATORS ({riskItems.length})</Text>
              <Bullets
                items={riskItems.map(n => `${n.label}: ${String(n.properties.status ?? n.properties.risk ?? 'At Risk')}`)}
                color={T.rose}
                mark="⚠"
              />
            </View>
          )}

          {latest?.result.keyFindings && latest.result.keyFindings.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>KEY FINDINGS</Text>
              <Bullets items={latest.result.keyFindings} color={T.cyan} mark="◆" />
            </View>
          )}

          {latest?.result.recommendations && latest.result.recommendations.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>RECOMMENDATIONS</Text>
              <Bullets items={latest.result.recommendations} color={T.emerald} mark="→" />
            </View>
          )}

          <View style={[S.section, { borderTopWidth: 1, borderTopColor: T.line, borderTopStyle: 'solid', paddingTop: 12, marginTop: 8 }]}>
            <Text style={{ fontSize: 7.5, color: T.muted }}>
              This report was generated automatically by Aether Intelligence OS on {date}. Data reflects current ontology state.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function buildFullOntology(opts: ReportOptions): React.ReactElement {
  const { data, title, template, graphScreenshot } = opts;
  const date    = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const byType  = ['Person', 'Project', 'Location', 'Metric', 'Insight', 'Event', 'Document']
    .map(type => ({ type, nodes: data.nodes.filter(n => n.type === type) }))
    .filter(g => g.nodes.length > 0);

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <ReportHeader title={title} template={template} date={date} />
        <ReportFooter title={title} />
        <View style={S.body}>
          <StatsBar data={data} />

          {graphScreenshot && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>INTELLIGENCE GRAPH</Text>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is a PDF primitive, not a DOM img */}
              <Image src={graphScreenshot} style={S.graphImage} />
            </View>
          )}

          {byType.map(({ type, nodes }) => (
            <View key={type} style={S.section}>
              <Text style={S.sectionTitle}>{type.toUpperCase()}S ({nodes.length})</Text>
              {nodes.slice(0, 12).map(n => <EntityCard key={n.id} node={n} data={data} />)}
              {nodes.length > 12 && (
                <Text style={{ fontSize: 7.5, color: T.muted, marginTop: 3 }}>
                  + {nodes.length - 12} more {type.toLowerCase()}s
                </Text>
              )}
            </View>
          ))}

          <View style={S.section}>
            <Text style={S.sectionTitle}>RELATIONSHIPS ({data.relationships.length})</Text>
            <RelTable data={data} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

function buildProjectDeepDive(opts: ReportOptions): React.ReactElement {
  const { data, title, template, focusNodeId, savedInsights } = opts;
  const date     = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const projects = focusNodeId
    ? data.nodes.filter(n => n.id === focusNodeId)
    : data.nodes.filter(n => n.type === 'Project');

  if (projects.length === 0) {
    return (
      <Document>
        <Page size="A4" style={S.page}>
          <ReportHeader title={title} template={template} date={date} />
          <ReportFooter title={title} />
          <View style={S.body}>
            <View style={S.summaryBox}>
              <Text style={S.summaryText}>No project entities found in the current ontology.</Text>
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      {projects.map((project) => {
        const conns   = data.relationships
          .filter(r => r.from === project.id || r.to === project.id)
          .map(r => {
            const otherId = r.from === project.id ? r.to : r.from;
            const other   = data.nodes.find(n => n.id === otherId);
            return other ? { rel: r, other } : null;
          })
          .filter((x): x is { rel: (typeof data.relationships)[0]; other: OntologyNode } => x !== null);

        const people   = conns.filter(c => c.other.type === 'Person');
        const metrics  = conns.filter(c => c.other.type === 'Metric');
        const related  = savedInsights.find(s =>
          s.query.toLowerCase().includes(project.label.toLowerCase())
        );
        const props    = Object.entries(project.properties)
          .filter(([k]) => !['source', 'analyzedAt', 'confidenceScore', 'keyFindings', 'recommendations', 'summary'].includes(k));

        return (
          <Page key={project.id} size="A4" style={S.page}>
            <ReportHeader title={title} template={template} date={date} />
            <ReportFooter title={title} />
            <View style={S.body}>
              {/* Project header card */}
              <View style={{ backgroundColor: '#F5F3FF', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <Text style={{ fontSize: 8, color: T.purple, letterSpacing: 1.5, marginBottom: 5, fontFamily: 'Helvetica-Bold' }}>PROJECT</Text>
                <Text style={{ fontSize: 19, fontFamily: 'Helvetica-Bold', color: '#1E1B4B', marginBottom: 10 }}>{project.label}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {props.slice(0, 6).map(([k, v]) => (
                    <View key={k} style={{ marginRight: 20, marginBottom: 6 }}>
                      <Text style={{ fontSize: 7, color: T.purple, letterSpacing: 0.8, marginBottom: 2, fontFamily: 'Helvetica-Bold' }}>
                        {k.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                      <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1E1B4B' }}>
                        {formatVal(v)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {related && (
                <View style={S.section}>
                  <Text style={S.sectionTitle}>AI ANALYSIS</Text>
                  <View style={S.summaryBox}>
                    <Text style={S.summaryText}>{related.result.summary}</Text>
                  </View>
                </View>
              )}

              {people.length > 0 && (
                <View style={S.section}>
                  <Text style={S.sectionTitle}>TEAM ({people.length})</Text>
                  {people.map(({ rel, other }) => (
                    <View key={rel.id} style={S.relRow}>
                      <Text style={[S.relFrom, { flex: 2 }]}>{other.label}</Text>
                      <Text style={S.relType}>{rel.type}</Text>
                      {!!other.properties.role && (
                        <Text style={{ fontSize: 8, color: T.muted, flex: 1, textAlign: 'right' }}>
                          {String(other.properties.role)}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {metrics.length > 0 && (
                <View style={S.section}>
                  <Text style={S.sectionTitle}>METRICS ({metrics.length})</Text>
                  <View style={S.metricsRow}>
                    {metrics.map(({ other }) => (
                      <View key={other.id} style={S.metricChip}>
                        <Text style={S.metricLabel}>{other.label}</Text>
                        <Text style={S.metricValue}>{formatVal(other.properties.value)}</Text>
                        {!!other.properties.unit && (
                          <Text style={S.metricUnit}>{String(other.properties.unit)}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {conns.length > 0 && (
                <View style={S.section}>
                  <Text style={S.sectionTitle}>ALL CONNECTIONS ({conns.length})</Text>
                  {conns.map(({ rel, other }) => (
                    <View key={rel.id} style={S.relRow}>
                      <Text style={S.relFrom}>{other.label}</Text>
                      <Text style={S.relType}>{rel.type}</Text>
                      <Text style={{ fontSize: 8, color: T.muted }}>{other.type}</Text>
                    </View>
                  ))}
                </View>
              )}

              {related?.result.recommendations && related.result.recommendations.length > 0 && (
                <View style={S.section}>
                  <Text style={S.sectionTitle}>RECOMMENDATIONS</Text>
                  <Bullets items={related.result.recommendations} color={T.emerald} mark="→" />
                </View>
              )}
            </View>
          </Page>
        );
      })}
    </Document>
  );
}

function buildRiskAssessment(opts: ReportOptions): React.ReactElement {
  const { data, title, template, savedInsights } = opts;
  const date       = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const riskNodes  = data.nodes.filter(n =>
    n.properties.status === 'At Risk' ||
    (typeof n.properties.risk === 'string' && n.properties.risk !== '' && n.properties.risk !== 'None')
  );
  const riskInsight = savedInsights.find(s => s.result.intent === 'risk');
  const riskFindings = savedInsights
    .flatMap(s => s.result.keyFindings)
    .filter(f => /risk|warn|concern|block|critical/i.test(f));

  const summaryText = riskInsight?.result.summary
    ?? `Risk assessment across ${data.nodes.length} entities. ${riskNodes.length} item${riskNodes.length !== 1 ? 's' : ''} identified as potentially at risk. Immediate review recommended for all flagged entities.`;

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <ReportHeader title={title} template={template} date={date} />
        <ReportFooter title={title} />
        <View style={S.body}>
          <StatsBar data={data} />

          <View style={S.section}>
            <Text style={S.sectionTitle}>RISK OVERVIEW</Text>
            <View style={[S.summaryBox, { backgroundColor: '#FFF1F2', borderLeftColor: T.rose }]}>
              <Text style={S.summaryText}>{summaryText}</Text>
            </View>
          </View>

          {riskNodes.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>AT-RISK ENTITIES ({riskNodes.length})</Text>
              {riskNodes.map(n => <EntityCard key={n.id} node={n} data={data} />)}
            </View>
          )}

          {riskFindings.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>RISK FINDINGS</Text>
              <Bullets items={riskFindings.slice(0, 10)} color={T.rose} mark="⚠" />
            </View>
          )}

          {riskInsight && riskInsight.result.keyFindings.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>KEY FINDINGS</Text>
              <Bullets items={riskInsight.result.keyFindings} color={T.amber} mark="◆" />
            </View>
          )}

          {/* Exposure map */}
          {riskNodes.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>EXPOSURE MAP</Text>
              {riskNodes.slice(0, 5).map(node => {
                const nodeConns = data.relationships.filter(r => r.from === node.id || r.to === node.id);
                if (nodeConns.length === 0) return null;
                return (
                  <View key={node.id} style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: T.rose, marginBottom: 4 }}>
                      {node.label}
                    </Text>
                    {nodeConns.map(r => {
                      const other = data.nodes.find(n => n.id === (r.from === node.id ? r.to : r.from));
                      if (!other) return null;
                      return (
                        <View key={r.id} style={S.relRow}>
                          <Text style={S.relType}>{r.type}</Text>
                          <Text style={[S.relFrom, { color: T.muted }]}>{other.label}</Text>
                          <Text style={{ fontSize: 7.5, color: T.subtle }}>{other.type}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}

          {riskInsight?.result.recommendations && riskInsight.result.recommendations.length > 0 && (
            <View style={S.section}>
              <Text style={S.sectionTitle}>MITIGATION RECOMMENDATIONS</Text>
              <Bullets items={riskInsight.result.recommendations} color={T.emerald} mark="→" />
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

function buildGeospatialOverview(opts: ReportOptions): React.ReactElement {
  const { data, title, template } = opts;
  const date      = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const locations = data.nodes.filter(n => n.type === 'Location');

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <ReportHeader title={title} template={template} date={date} />
        <ReportFooter title={title} />
        <View style={S.body}>
          <StatsBar data={data} />

          <View style={S.section}>
            <Text style={S.sectionTitle}>LOCATION OVERVIEW</Text>
            <View style={S.summaryBox}>
              <Text style={S.summaryText}>
                {`${locations.length} location${locations.length !== 1 ? 's' : ''} tracked across the intelligence graph, spanning ${[...new Set(locations.map(l => l.properties.country ?? l.properties.region ?? 'Unknown'))].join(', ')}.`}
              </Text>
            </View>
          </View>

          {locations.map(loc => {
            const locConns = data.relationships
              .filter(r => r.from === loc.id || r.to === loc.id)
              .map(r => {
                const other = data.nodes.find(n => n.id === (r.from === loc.id ? r.to : r.from));
                return other ? { rel: r, other } : null;
              })
              .filter((x): x is { rel: (typeof data.relationships)[0]; other: OntologyNode } => x !== null);

            return (
              <View key={loc.id} style={S.section}>
                <Text style={S.sectionTitle}>{loc.label.toUpperCase()}</Text>
                <EntityCard node={loc} data={data} />
                {locConns.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 7.5, color: T.muted, letterSpacing: 0.8, marginBottom: 5 }}>
                      CONNECTED ENTITIES
                    </Text>
                    {locConns.map(({ rel, other }) => (
                      <View key={rel.id} style={S.relRow}>
                        <Text style={S.relType}>{rel.type}</Text>
                        <Text style={S.relFrom}>{other.label}</Text>
                        <Text style={{ fontSize: 7.5, color: T.muted }}>{other.type}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {locations.length === 0 && (
            <View style={[S.summaryBox, { backgroundColor: T.surface, borderLeftColor: T.subtle }]}>
              <Text style={S.summaryText}>No location entities found in the current ontology.</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function generatePDF(opts: ReportOptions): Promise<Blob> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { pdf } = await import('@react-pdf/renderer') as any;

  let doc: React.ReactElement;
  switch (opts.template) {
    case 'executive-summary':   doc = buildExecutiveSummary(opts);   break;
    case 'full-ontology':       doc = buildFullOntology(opts);        break;
    case 'project-deep-dive':   doc = buildProjectDeepDive(opts);     break;
    case 'risk-assessment':     doc = buildRiskAssessment(opts);      break;
    case 'geospatial-overview': doc = buildGeospatialOverview(opts);  break;
    default:                    doc = buildExecutiveSummary(opts);
  }

  return pdf(doc).toBlob();
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
