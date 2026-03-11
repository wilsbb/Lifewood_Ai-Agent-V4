import { formatPeso } from '../../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts plain text with basic markdown-ish patterns into styled spans.
 * Handles: **bold**, `code`, bullet lines (- or •), ₱ amounts highlighted.
 */
function renderContent(text) {
  if (!text) return null;

  return text.split('\n').map((line, li) => {
    const isBullet = /^(\s*[-•*]\s)/.test(line);
    const parts = [];
    let remaining = isBullet ? line.replace(/^(\s*[-•*]\s)/, '') : line;
    let key = 0;

    // Process inline patterns
    const pattern = /(\*\*(.+?)\*\*|`([^`]+)`|₱[\d,]+(\.\d{2})?)/g;
    let last = 0;
    let match;

    while ((match = pattern.exec(remaining)) !== null) {
      if (match.index > last) {
        parts.push(<span key={key++}>{remaining.slice(last, match.index)}</span>);
      }
      if (match[0].startsWith('**')) {
        parts.push(
          <strong key={key++} style={{ color: '#f9fafb', fontWeight: 700 }}>
            {match[2]}
          </strong>
        );
      } else if (match[0].startsWith('`')) {
        parts.push(
          <code key={key++} style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            background: 'rgba(245,158,11,0.15)',
            color: '#f59e0b',
            padding: '1px 5px',
            borderRadius: '4px',
          }}>
            {match[3]}
          </code>
        );
      } else if (match[0].startsWith('₱')) {
        parts.push(
          <span key={key++} style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            color: '#f59e0b',
          }}>
            {match[0]}
          </span>
        );
      }
      last = match.index + match[0].length;
    }

    if (last < remaining.length) {
      parts.push(<span key={key++}>{remaining.slice(last)}</span>);
    }

    return (
      <div
        key={li}
        style={{
          display: 'flex',
          gap: isBullet ? '8px' : 0,
          marginTop: li > 0 ? '4px' : 0,
          alignItems: 'flex-start',
        }}
      >
        {isBullet && (
          <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: '1px', fontSize: '10px' }}>▸</span>
        )}
        <span>{parts}</span>
      </div>
    );
  });
}

// ── Timestamp ─────────────────────────────────────────────────────────────────
function Timestamp({ ts }) {
  if (!ts) return null;
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{
      fontFamily: "'Syne', sans-serif",
      fontSize: '10px',
      color: '#4b5563',
      marginTop: '4px',
      textAlign: 'right',
    }}>
      {time}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ role }) {
  if (role === 'user') return null;
  return (
    <div style={{
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      flexShrink: 0,
      alignSelf: 'flex-end',
    }}>
      🤖
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * ChatMessage
 *
 * Props:
 *   role       'user' | 'agent'
 *   content    string
 *   timestamp  ISO string or Date (optional)
 *   error      boolean (optional) — renders error styling
 *   receipts   array (optional) — linked receipt chips
 */
export default function ChatMessage({ role, content, timestamp, error = false, receipts = [] }) {
  const isUser  = role === 'user';
  const isAgent = role === 'agent';

  const bubbleStyle = {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: error
      ? 'rgba(239,68,68,0.12)'
      : isUser
        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
        : '#111827',
    border: error
      ? '1px solid rgba(239,68,68,0.3)'
      : isAgent
        ? '1px solid #1f2937'
        : 'none',
    color: isUser && !error ? '#0a0e1a' : '#f9fafb',
    fontFamily: "'Syne', sans-serif",
    fontSize: '13px',
    lineHeight: 1.6,
    wordBreak: 'break-word',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: '2px',
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        {isAgent && <Avatar role="agent" />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '85%' }}>
          <div style={bubbleStyle}>
            {error && (
              <div style={{ marginBottom: '4px', fontSize: '12px', color: '#f87171' }}>
                ⚠️ Error
              </div>
            )}
            {renderContent(content)}
          </div>

          {/* Linked receipt chips */}
          {receipts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '2px' }}>
              {receipts.map((r, i) => (
                <span key={i} style={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  color: '#9ca3af',
                  cursor: 'default',
                }}>
                  🧾 {r.business_name || `Receipt #${r.id}`}
                  {r.total ? ` · ₱${parseFloat(r.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Timestamp ts={timestamp} />
    </div>
  );
}