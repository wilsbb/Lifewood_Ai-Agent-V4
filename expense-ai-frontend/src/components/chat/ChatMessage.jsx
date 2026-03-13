import { formatPeso } from '../../lib/api';

function renderContent(text) {
  if (!text) return null;

  return text.split('\n').map((line, li) => {
    const isBullet = /^\s*[-*]\s/.test(line);
    const parts = [];
    let remaining = isBullet ? line.replace(/^\s*[-*]\s/, '') : line;
    let key = 0;

    const pattern = /(\*\*(.+?)\*\*|`([^`]+)`|PHP\s?[\d,]+(\.\d{2})?)/g;
    let last = 0;
    let match;

    while ((match = pattern.exec(remaining)) !== null) {
      if (match.index > last) {
        parts.push(<span key={key++}>{remaining.slice(last, match.index)}</span>);
      }
      if (match[0].startsWith('**')) {
        parts.push(
          <strong key={key++} style={{ color: 'var(--lw-text)', fontWeight: 700 }}>
            {match[2]}
          </strong>
        );
      } else if (match[0].startsWith('`')) {
        parts.push(
          <code key={key++} style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '11px',
            background: 'rgba(255,179,71,0.2)',
            color: 'var(--lw-dark)',
            padding: '1px 5px',
            borderRadius: '4px',
          }}>
            {match[3]}
          </code>
        );
      } else if (match[0].startsWith('PHP')) {
        parts.push(
          <span key={key++} style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 700,
            color: 'var(--lw-accent-deep)',
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
          <span style={{ color: 'var(--lw-accent-deep)', flexShrink: 0, marginTop: '1px', fontSize: '10px' }}>-</span>
        )}
        <span>{parts}</span>
      </div>
    );
  });
}

function Timestamp({ ts }) {
  if (!ts) return null;
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{
      fontFamily: "'Manrope', sans-serif",
      fontSize: '10px',
      color: 'var(--lw-muted)',
      marginTop: '4px',
      textAlign: 'right',
    }}>
      {time}
    </div>
  );
}

function Avatar({ role }) {
  if (role === 'user') return null;
  return (
    <div style={{
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: 'var(--lw-accent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      flexShrink: 0,
      alignSelf: 'flex-end',
      color: 'var(--lw-dark)',
      fontWeight: 700,
    }}>
      AI
    </div>
  );
}

export default function ChatMessage({ role, content, timestamp, error = false, receipts = [] }) {
  const isUser  = role === 'user';
  const isAgent = role === 'agent';

  const bubbleStyle = {
    padding: '10px 14px',
    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: error
      ? 'rgba(193,113,16,0.12)'
      : isUser
        ? 'var(--lw-accent)'
        : 'var(--lw-sea-salt)',
    border: error
      ? '1px solid rgba(193,113,16,0.3)'
      : isAgent
        ? '1px solid var(--lw-border)'
        : 'none',
    color: 'var(--lw-dark)',
    fontFamily: "'Manrope', sans-serif",
    fontSize: '13px',
    lineHeight: 1.6,
    wordBreak: 'break-word',
    boxShadow: isUser ? '0 6px 14px rgba(255,179,71,0.25)' : 'none',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: '2px',
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
        {isAgent && <Avatar role="agent" />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '85%' }}>
          <div style={bubbleStyle}>
            {error && (
              <div style={{ marginBottom: '4px', fontSize: '12px', color: '#C17110' }}>
                Error
              </div>
            )}
            {renderContent(content)}
          </div>

          {receipts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '2px' }}>
              {receipts.map((r, i) => (
                <span key={i} style={{
                  background: 'var(--lw-sea-salt)',
                  border: '1px solid var(--lw-border)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '10px',
                  color: 'var(--lw-muted)',
                  cursor: 'default',
                }}>
                  Receipt {r.business_name || `#${r.id}`}
                  {r.total ? ` - ${formatPeso(parseFloat(r.total))}` : ''}
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
