import { getComplianceIssues, formatPeso } from '../../lib/api';

const cardStyle = {
  background: 'linear-gradient(135deg, #111827 0%, #0f172a 100%)',
  border: '1px solid #1f2937',
  borderRadius: '12px',
  padding: '24px',
};

const titleStyle = {
  fontFamily: "'Syne', sans-serif",
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#6b7280',
  marginBottom: '16px',
};

const SEVERITY = {
  high:   { border: '#ef4444', bg: 'rgba(239,68,68,0.08)',   icon: '🔴', label: 'High' },
  medium: { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: '🟡', label: 'Medium' },
  low:    { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  icon: '🔵', label: 'Low' },
};

export default function ComplianceAlerts({ receipts, loading }) {
  if (loading) return (
    <div style={cardStyle}>
      <div style={titleStyle}>BIR Compliance Alerts</div>
      <div style={{ height: '120px', background: '#1f2937', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  const issues = getComplianceIssues(receipts || []);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={titleStyle}>BIR Compliance Alerts</div>
        {issues.length > 0 && (
          <span style={{
            background: 'rgba(239,68,68,0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '20px',
            padding: '2px 10px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            fontWeight: 700,
          }}>
            {issues.length} issue{issues.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {issues.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '8px',
        }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#34d399', fontWeight: 600 }}>
              All receipts are BIR compliant
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
              All mandatory fields are present on processed receipts
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {issues.slice(0, 5).map((issue, i) => {
            const s = SEVERITY[issue.severity];
            return (
              <div key={i} style={{
                background: s.bg,
                border: `1px solid ${s.border}30`,
                borderLeft: `3px solid ${s.border}`,
                borderRadius: '8px',
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{s.icon}</span>
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', color: '#f9fafb', fontWeight: 500 }}>
                        {issue.business}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {issue.date || 'Unknown date'} · {formatPeso(issue.total)}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '10px', color: '#9ca3af' }}>Missing:</span>
                  {issue.missing.map((m) => (
                    <span key={m} style={{
                      background: '#1f2937',
                      color: '#f87171',
                      border: '1px solid #374151',
                      borderRadius: '4px',
                      padding: '1px 7px',
                      fontFamily: "'Syne', sans-serif",
                      fontSize: '10px',
                      fontWeight: 600,
                    }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {issues.length > 5 && (
            <div style={{ textAlign: 'center', fontFamily: "'Syne', sans-serif", fontSize: '11px', color: '#6b7280', paddingTop: '4px' }}>
              +{issues.length - 5} more issues — ask the AI agent to review all
            </div>
          )}
        </div>
      )}
    </div>
  );
}