import { useState, useEffect, useRef } from 'react';
import { sendMessage, fetchHistory } from '../../lib/api';
import ChatMessage from './ChatMessage';
import ChatInput   from './ChatInput';

// ── Styles ───────────────────────────────────────────────────────────────────

const fabStyle = (open) => ({
  position: 'fixed',
  bottom: '28px',
  right: '28px',
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  background: open ? '#1f2937' : 'linear-gradient(135deg, #f59e0b, #d97706)',
  border: open ? '2px solid #374151' : 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '22px',
  boxShadow: open ? 'none' : '0 8px 32px rgba(245,158,11,0.4)',
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  zIndex: 1000,
  outline: 'none',
});

const panelStyle = (open) => ({
  position: 'fixed',
  bottom: '96px',
  right: '28px',
  width: '380px',
  height: '580px',
  background: '#0a0e1a',
  border: '1px solid #1f2937',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
  zIndex: 999,
  opacity: open ? 1 : 0,
  transform: open ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
  pointerEvents: open ? 'auto' : 'none',
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
});

const headerStyle = {
  background: 'linear-gradient(135deg, #111827, #0f172a)',
  borderBottom: '1px solid #1f2937',
  padding: '16px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const msgBubble = (role) => ({
  maxWidth: '85%',
  padding: '10px 14px',
  borderRadius: role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
  background: role === 'user'
    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
    : '#111827',
  border: role === 'agent' ? '1px solid #1f2937' : 'none',
  color: role === 'user' ? '#0a0e1a' : '#f9fafb',
  fontFamily: "'Syne', sans-serif",
  fontSize: '13px',
  lineHeight: 1.6,
  alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

const SUGGESTIONS = [
  'How much did I spend this month?',
  'What are my top expense categories?',
  'Are my receipts BIR compliant?',
  'Explain VAT rules under EOPT Act',
];

// ── Component ────────────────────────────────────────────────────────────────

export default function ChatPanel({ conversationId, onConversationCreate }) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [convId,   setConvId]   = useState(conversationId || null);
  const bottomRef              = useRef(null);

  // Load history when panel opens
  useEffect(() => {
    if (open && convId) {
      fetchHistory(convId)
        .then(data => setMessages(data.messages || []))
        .catch(() => {});
    }
  }, [open, convId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (msg) => {
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const data = await sendMessage(msg, convId, history);

      if (data.conversation_id && !convId) {
        setConvId(data.conversation_id);
        onConversationCreate?.(data.conversation_id);
      }

      setMessages(prev => [...prev, {
        role: 'agent',
        content: data.reply || data.message || 'No response',
        id: Date.now() + 1,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: '⚠️ Could not reach the AI agent. Make sure n8n is running and the webhook URL is set.',
        id: Date.now() + 1,
        error: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Panel */}
      <div style={panelStyle(open)}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', flexShrink: 0,
          }}>
            🤖
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, color: '#f9fafb' }}>
              Lifewood Expense AI
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '11px', color: '#10b981' }}>
              ● Online · GPT-4o mini
            </div>
          </div>
          <button
            onClick={() => setMessages([])}
            title="Clear chat"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: '16px', padding: '4px' }}
          >
            🗑
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', color: '#9ca3af', lineHeight: 1.5 }}>
                  Ask me anything about your<br />expenses or BIR compliance
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}                    style={{
                      background: '#111827',
                      border: '1px solid #1f2937',
                      borderRadius: '8px',
                      padding: '10px 10px',
                      color: '#9ca3af',
                      fontFamily: "'Syne', sans-serif",
                      fontSize: '11px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      lineHeight: 1.4,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b50'; e.currentTarget.style.color = '#f9fafb'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f2937'; e.currentTarget.style.color = '#9ca3af'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              role={m.role}
              content={m.content}
              timestamp={m.timestamp}
              error={m.error}
              receipts={m.receipts || []}
            />
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ ...msgBubble('agent'), display: 'flex', gap: '4px', padding: '12px 16px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: '#f59e0b',
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={loading}
        />
      </div>

      {/* FAB */}
      <button style={fabStyle(open)} onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '💬'}
      </button>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}