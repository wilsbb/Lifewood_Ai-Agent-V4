'use client';

import { formatPeso, getApiBaseUrl } from '../../lib/api';

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
            borderRadius: '5px',
          }}>
            {match[3]}
          </code>
        );
      } else if (match[0].startsWith('PHP')) {
        parts.push(
          <span key={key++} style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, color: 'var(--lw-accent-deep)' }}>
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
      <div key={li} style={{
        display: 'flex',
        gap: isBullet ? '8px' : 0,
        marginTop: li > 0 ? '4px' : 0,
        alignItems: 'flex-start',
      }}>
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

// ── Download button rendered inside agent messages with export metadata ───
function DownloadButton({ downloadUrl, receiptCount, folderFilter }) {
  // downloadUrl from backend is the full backend URL already
  // Make sure it's absolute
  const href = downloadUrl.startsWith('http') ? downloadUrl : `${getApiBaseUrl()}${downloadUrl}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginTop: '10px',
        padding: '9px 16px',
        background: 'var(--lw-green)',
        color: '#fff',
        borderRadius: '10px',
        textDecoration: 'none',
        fontFamily: "'Manrope', sans-serif",
        fontSize: '12px',
        fontWeight: 700,
        boxShadow: '0 4px 12px rgba(4,98,65,0.25)',
        transition: 'all 0.15s',
        border: '1px solid rgba(4,98,65,0.3)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#035535'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--lw-green)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Download icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Download Excel
      {folderFilter ? ` — ${folderFilter}` : ''}
      {receiptCount ? ` (${receiptCount})` : ''}
    </a>
  );
}

export default function ChatMessage({ role, content, timestamp, error = false, receipts = [], metadata = {} }) {
  const isUser  = role === 'user';
  const isAgent = role === 'agent';

  // Check if this is an export response
  const isExport    = metadata?.export === true;
  const downloadUrl = metadata?.download_url;
  const receiptCount = metadata?.receipt_count;
  const folderFilter = metadata?.folder_filter;

  const bubbleStyle = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: 'fit-content',
    minWidth: isUser ? '64px' : '56px',
    maxWidth: 'min(85%, 420px)',
    padding: '10px 14px',
    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: error
      ? 'rgba(193,113,16,0.12)'
      : isUser
        ? 'var(--lw-accent)'
        : 'var(--lw-surface-alt)',
    border: error
      ? '1px solid rgba(193,113,16,0.3)'
      : isAgent
        ? '1px solid var(--glass-border)'
        : 'none',
    color: 'var(--lw-dark)',
    fontFamily: "'Manrope', sans-serif",
    fontSize: '13px',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'normal',
    overflowWrap: 'anywhere',
    textAlign: 'left',
    boxShadow: isUser ? '0 6px 14px rgba(255,179,71,0.25)' : 'none',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: '2px',
      width: '100%',
    }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        width: '100%',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}>
        {isAgent && <Avatar role="agent" />}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxWidth: isUser ? '85%' : '100%',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}>
          <div style={bubbleStyle}>
            {error && (
              <div style={{ marginBottom: '4px', fontSize: '12px', color: '#C17110' }}>
                Error
              </div>
            )}
            {renderContent(content)}

            {/* ── Download button for export messages ── */}
            {isExport && downloadUrl && (
              <DownloadButton
                downloadUrl={downloadUrl}
                receiptCount={receiptCount}
                folderFilter={folderFilter}
              />
            )}
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
