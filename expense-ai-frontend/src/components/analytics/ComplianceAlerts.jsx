import { getComplianceIssues, formatPeso } from '../../lib/api';

const cardStyle = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: 'var(--glass-shadow)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const titleStyle = {
  fontFamily: "'Manrope', sans-serif",
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--lw-muted)',
  marginBottom: '16px',
};

const SEVERITY = {
  high:   { border: '#C17110', bg: 'rgba(193,113,16,0.12)', label: 'High' },
  medium: { border: '#FFB347', bg: 'rgba(255,179,71,0.14)', label: 'Medium' },
  low:    { border: '#046241', bg: 'rgba(4,98,65,0.12)', label: 'Low' },
};

export default function ComplianceAlerts({ receipts, loading }) {
  if (loading) return (
    <div style={cardStyle}>
      <div style={titleStyle}>BIR Compliance Alerts</div>
      <div style={{ height: '120px', background: 'var(--lw-sea-salt)', borderRadius: '10px', animation: 'pulse 1.5s infinite' }} />
    </div>
  );

  const issues = getComplianceIssues(receipts || []);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={titleStyle}>BIR Compliance Alerts</div>
        {issues.length > 0 && (
          <span style={{
            background: 'rgba(193,113,16,0.12)',
            color: '#C17110',
            border: '1px solid rgba(193,113,16,0.3)',
            borderRadius: '20px',
            padding: '2px 10px',
            fontFamily: "'Manrope', sans-serif",
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
          background: 'rgba(4,98,65,0.08)',
          border: '1px solid rgba(4,98,65,0.2)',
          borderRadius: '10px',
        }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#046241',
            display: 'inline-block',
          }} />
          <div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '13px', color: '#046241', fontWeight: 600 }}>
              All receipts are BIR compliant
            </div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: 'var(--lw-muted)', marginTop: '2px' }}>
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
                border: `1px solid ${s.border}40`,
                borderLeft: `3px solid ${s.border}`,
                borderRadius: '10px',
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: s.border,
                      color: 'var(--lw-white)',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '10px',
                      fontWeight: 700,
                    }}>
                      {s.label}
                    </span>
                    <div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '13px', color: 'var(--lw-text)', fontWeight: 600 }}>
                        {issue.business}
                      </div>
                      <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: 'var(--lw-muted)', marginTop: '2px' }}>
                        {issue.date || 'Unknown date'} - {formatPeso(issue.total)}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '10px', color: 'var(--lw-muted)' }}>Missing:</span>
                  {issue.missing.map((m) => (
                    <span key={m} style={{
                      background: 'var(--lw-sea-salt)',
                      color: 'var(--lw-accent-deep)',
                      border: '1px solid var(--lw-border)',
                      borderRadius: '6px',
                      padding: '1px 7px',
                      fontFamily: "'Manrope', sans-serif",
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
            <div style={{ textAlign: 'center', fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: 'var(--lw-muted)', paddingTop: '4px' }}>
              +{issues.length - 5} more issues - ask the AI agent to review all
            </div>
          )}
        </div>
      )}
    </div>
  );
}
