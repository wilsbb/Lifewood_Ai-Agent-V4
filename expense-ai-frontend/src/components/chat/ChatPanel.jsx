'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { fetchHistory, getApiBaseUrl } from '../../lib/api';
import ChatMessage from './ChatMessage';
import ChatInput   from './ChatInput';

const LOGO_URL  = 'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png?width=1519&height=429';

const fabStyle = (open) => ({
  position: 'fixed',
  bottom: 'var(--lw-fab-bottom)',
  right: 'var(--lw-fab-right)',
  width: '56px',
  height: '56px',
  borderRadius: '18px',
  background: open ? 'var(--lw-white)' : 'var(--lw-accent)',
  border: open ? '1px solid var(--lw-border)' : '0',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  color: 'var(--lw-dark)',
  boxShadow: open ? 'var(--lw-shadow-soft)' : '0 14px 32px rgba(255,179,71,0.35)',
  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  zIndex: 1000,
  outline: 'none',
});

const panelStyle = (open, dragging) => ({
  position: 'fixed',
  bottom: 'var(--lw-chat-bottom)',
  right: 'var(--lw-chat-right)',
  width: 'var(--lw-chat-width)',
  height: 'min(var(--lw-chat-height), calc(100vh - 140px))',
  maxHeight: 'calc(100vh - 140px)',
  background: 'var(--glass-bg-strong)',
  border: '1px solid var(--glass-border)',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: 'var(--glass-shadow)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  zIndex: 999,
  opacity: open ? 1 : 0,
  transform: open ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
  pointerEvents: open ? 'auto' : 'none',
  transition: dragging ? 'none' : 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
});

const headerStyle = {
  background: 'linear-gradient(180deg, rgba(255,242,220,0.95) 0%, rgba(255,228,190,0.85) 100%)',
  borderBottom: '1px solid var(--glass-border)',
  padding: '14px 18px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexShrink: 0,
};

const msgBubble = (role) => ({
  maxWidth: '85%',
  padding: '10px 14px',
  borderRadius: role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
  background: role === 'user' ? 'var(--lw-accent)' : 'var(--lw-sea-salt)',
  border: role === 'agent' ? '1px solid var(--lw-border)' : 'none',
  color: 'var(--lw-dark)',
  fontFamily: "'Manrope', sans-serif",
  fontSize: '13px',
  lineHeight: 1.6,
  alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

const SUGGESTIONS = [
  'How much did I spend this month?',
  'Show spending by folder',
  'Export all receipts to Excel',
  'Are my receipts BIR compliant?',
];

const BUBBLES = [
  'How may I help you today?',
  'Upload a receipt to scan it! 📎',
  'Ask me how much you spend this month!',
  'Export receipts to Excel 📊',
  'Check if receipts are BIR compliant',
  'Ask for spending by folder',
  'Need help reviewing a receipt?',
  'Want a quick expense summary?',
  'Need VAT guidance?',
];

const FAB_SIZE     = 56;
const GAP          = 12;
const PANEL_OFFSET = 68;

export default function ChatPanel({ conversationId, onConversationCreate }) {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [convId,   setConvId]   = useState(conversationId || null);

  // ── Draggable FAB state ────────────────────────────────────────────────
  const [headPos,     setHeadPos]     = useState({ right: 12, bottom: 28 });
  const [dragVisual,  setDragVisual]  = useState(null);
  const [panelPos,    setPanelPos]    = useState(null);
  const [snapping,    setSnapping]    = useState(false);
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [bubbleAnim,  setBubbleAnim]  = useState('bubble-in');
  const [bubbleSide,  setBubbleSide]  = useState('right');

  const abortRef     = useRef(null);
  const requestIdRef = useRef(0);
  const bottomRef    = useRef(null);
  const bubbleRef    = useRef(null);
  const panelRef     = useRef(null);
  const panelSize    = useRef({ w: 380, h: 580 });
  const dragState    = useRef({
    dragging: false, moved: false,
    startX: 0, startY: 0, startRight: 0, startBottom: 0,
  });

  const currentRight  = dragVisual?.right  ?? headPos.right;
  const currentBottom = dragVisual?.bottom ?? headPos.bottom;

  // ── Load history when opened ───────────────────────────────────────────
  useEffect(() => {
    if (open && convId) {
      fetchHistory(convId).then(d => setMessages(d.messages || [])).catch(() => {});
    }
  }, [open, convId]);

  // ── Scroll to bottom ───────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Rotate bubble text ─────────────────────────────────────────────────
  useEffect(() => {
    if (open) return;
    const id = window.setInterval(() => {
      setBubbleAnim('bubble-out');
      window.setTimeout(() => {
        setBubbleIndex(p => (p + 1) % BUBBLES.length);
        setBubbleAnim('bubble-in');
      }, 220);
    }, 6000);
    return () => window.clearInterval(id);
  }, [open]);

  // ── Bubble side based on FAB position ─────────────────────────────────
  useEffect(() => {
    if (open) return;
    const vw          = window.innerWidth;
    const bubbleWidth = bubbleRef.current?.offsetWidth || 220;
    const bubbleGap   = 72;
    const fabLeft     = vw - currentRight - FAB_SIZE;
    const spaceRight  = vw - (fabLeft + FAB_SIZE + bubbleGap);
    setBubbleSide(spaceRight < bubbleWidth && fabLeft - bubbleGap >= bubbleWidth ? 'left' : 'right');
  }, [open, currentRight, bubbleIndex]);

  // ── Restore FAB position from localStorage ─────────────────────────────
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('lwChatHeadPos');
      if (saved) {
        const parsed = JSON.parse(saved);
        const vw       = window.innerWidth;
        const maxRight = Math.max(12, vw - FAB_SIZE - 12);
        if (typeof parsed?.right === 'number' && typeof parsed?.bottom === 'number') {
          const fabLeft   = vw - parsed.right - FAB_SIZE;
          const snapRight = fabLeft < vw / 2 ? maxRight : 12;
          setHeadPos({ right: snapRight, bottom: parsed.bottom });
        } else if ((parsed?.side === 'left' || parsed?.side === 'right') && typeof parsed?.bottom === 'number') {
          setHeadPos({ right: parsed.side === 'left' ? maxRight : 12, bottom: parsed.bottom });
        }
      }
    } catch {}
  }, []);

  // ── Position panel relative to FAB ────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      updatePanelSize();
      const vw        = window.innerWidth;
      const fabLeft   = vw - currentRight - FAB_SIZE;
      const openRight = fabLeft < vw / 2;
      const targetLeft = openRight
        ? fabLeft + FAB_SIZE + GAP
        : fabLeft - panelSize.current.w - GAP;
      setPanelPos(clampPanel({ left: targetLeft, bottom: currentBottom + PANEL_OFFSET }, panelSize.current));
    });
    return () => cancelAnimationFrame(id);
  }, [open, currentRight, currentBottom]);

  // ── Save FAB position ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    try { window.localStorage.setItem('lwChatHeadPos', JSON.stringify(headPos)); } catch {}
  }, [headPos, open]);

  // ── Reset on close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (open) return;
    setHeadPos({ right: 12, bottom: 28 });
    setDragVisual(null);
  }, [open]);

  // ── Global drag listeners ──────────────────────────────────────────────
  useEffect(() => {
    const handleMove = (e) => {
      if (!dragState.current.dragging) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.current.moved = true;
      const next = clampPos(
        { right: Math.max(12, dragState.current.startRight - dx), bottom: Math.max(12, dragState.current.startBottom - dy) },
        { w: FAB_SIZE, h: FAB_SIZE },
      );
      setDragVisual(next);
      if (open) {
        const vw        = window.innerWidth;
        const fabLeft   = vw - next.right - FAB_SIZE;
        const openRight = fabLeft < vw / 2;
        const targetLeft = openRight ? fabLeft + FAB_SIZE + GAP : fabLeft - panelSize.current.w - GAP;
        setPanelPos(clampPanel({ left: targetLeft, bottom: next.bottom + PANEL_OFFSET }, panelSize.current));
      }
    };

    const handleUp = () => {
      dragState.current.dragging = false;
      if (!dragVisual) return;
      const vw        = window.innerWidth;
      const maxRight  = Math.max(12, vw - FAB_SIZE - 12);
      const fabLeft   = vw - dragVisual.right - FAB_SIZE;
      const snapRight = fabLeft < vw / 2 ? maxRight : 12;
      const snapped   = { right: snapRight, bottom: dragVisual.bottom };
      setSnapping(true);
      setHeadPos(snapped);
      setDragVisual(null);
      if (open) {
        const targetLeft = snapRight === maxRight
          ? (vw - snapRight - FAB_SIZE) + FAB_SIZE + GAP
          : (vw - snapRight - FAB_SIZE) - panelSize.current.w - GAP;
        setPanelPos(clampPanel({ left: targetLeft, bottom: snapped.bottom + PANEL_OFFSET }, panelSize.current));
      }
      window.setTimeout(() => setSnapping(false), 220);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup',   handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup',   handleUp);
    };
  }, [dragVisual, open]);

  // ── Window resize ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      updatePanelSize();
      const base = { right: currentRight, bottom: currentBottom };
      if (open) {
        const vw        = window.innerWidth;
        const fabLeft   = vw - base.right - FAB_SIZE;
        const openRight = fabLeft < vw / 2;
        const targetLeft = openRight ? fabLeft + FAB_SIZE + GAP : fabLeft - panelSize.current.w - GAP;
        setPanelPos(clampPanel({ left: targetLeft, bottom: base.bottom + PANEL_OFFSET }, panelSize.current));
      }
      const clamped  = clampPos(base, { w: FAB_SIZE, h: FAB_SIZE });
      const maxRight = Math.max(12, window.innerWidth - FAB_SIZE - 12);
      setHeadPos({ right: clamped.right > 12 ? maxRight : 12, bottom: clamped.bottom });
      setDragVisual(null);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, currentRight, currentBottom]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const clampPos = (pos, size) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      right:  Math.min(Math.max(12, pos.right),  Math.max(12, vw - size.w - 12)),
      bottom: Math.min(Math.max(12, pos.bottom), Math.max(12, vh - size.h - 12)),
    };
  };

  const clampPanel = (pos, size) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      left:   Math.min(Math.max(12, pos.left),   Math.max(12, vw - size.w - 12)),
      bottom: Math.min(Math.max(12, pos.bottom), Math.max(12, vh - size.h - 12)),
    };
  };

  const updatePanelSize = () => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    if (rect.width && rect.height) panelSize.current = { w: rect.width, h: rect.height };
  };

  const startDrag = (e) => {
    dragState.current = {
      dragging: true, moved: false,
      startX: e.clientX, startY: e.clientY,
      startRight: currentRight, startBottom: currentBottom,
    };
  };

  // ── Send handler — plain messages AND file uploads ─────────────────────
  const handleSend = async (msg, file = null) => {
    if (!msg && !file) return;
    if (loading) return;

    const displayContent = file
      ? `📎 ${file.name}${msg ? `\n${msg}` : ''}`
      : msg;

    setMessages(prev => [...prev, { role: 'user', content: displayContent, id: Date.now() }]);
    setLoading(true);

    const requestId  = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let data;

      if (file) {
        // ── Receipt image upload ─────────────────────────────────────────
        const formData = new FormData();
        formData.append('file', file);
        formData.append('message', msg || 'Please process this receipt.');
        if (convId) formData.append('conversation_id', String(convId));

        const res = await fetch(`${getApiBaseUrl()}/api/billing/chat/upload-receipt/`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
          signal: controller.signal,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Upload failed: ${res.status}`);
        }
        data = await res.json();

      } else {
        // ── Normal text message ──────────────────────────────────────────
        const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
        const res = await fetch(`${getApiBaseUrl()}/api/billing/chat/message/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, conversation_id: convId, history }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
        data = await res.json();
      }

      if (controller.signal.aborted || requestIdRef.current !== requestId) return;

      if (data.conversation_id && !convId) {
        setConvId(data.conversation_id);
        onConversationCreate?.(data.conversation_id);
      }

      setMessages(prev => [...prev, {
        role:     'agent',
        content:  data.reply || data.message || 'No response',
        id:       Date.now() + 1,
        metadata: data.metadata || {},
      }]);

    } catch (err) {
      if (err?.name === 'AbortError') return;
      const errMsg = file
        ? `I had trouble processing your receipt: ${err.message}. Please check your Google Drive connection and try again.`
        : 'Could not reach the AI agent. Please try again in a moment.';
      setMessages(prev => [...prev, { role: 'agent', content: errMsg, id: Date.now() + 1, error: true }]);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  };

  const handleStop = () => {
    if (!loading) return;
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  };

  return (
    <>
      {/* ── Chat panel ── */}
      <div
        ref={panelRef}
        style={{
          ...panelStyle(open, dragState.current.dragging),
          left:   panelPos ? `${panelPos.left}px`   : 'auto',
          right:  panelPos ? 'auto'                 : 'var(--lw-chat-right)',
          bottom: panelPos ? `${panelPos.bottom}px` : 'var(--lw-chat-bottom)',
          transition: dragState.current.dragging
            ? 'none'
            : snapping
              ? 'all 0.22s cubic-bezier(0.2, 0.9, 0.2, 1)'
              : panelStyle(open, false).transition,
        }}
      >
        {/* Header */}
        <div style={headerStyle}>
          <img alt="Lifewood" src={LOGO_URL} style={{ height: '26px', width: 'auto', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--lw-text)' }}>
              Expense AI
            </div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '11px', color: 'var(--lw-green)' }}>
              Online · GPT-4o
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setMessages([])}
              title="Clear chat"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lw-muted)', fontSize: '12px', padding: '6px' }}
            >
              Clear
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{ width: '30px', height: '30px', borderRadius: '10px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lw-dark)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
              <div style={{ textAlign: 'center', padding: '14px 0' }}>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '13px', color: 'var(--lw-muted)', lineHeight: 1.6 }}>
                  Ask about your expenses, export to Excel,<br />
                  or <strong style={{ color: 'var(--lw-accent-deep)' }}>📎 attach a receipt</strong> to scan &amp; upload it
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    style={{
                      background: 'var(--lw-sea-salt)',
                      border: '1px solid var(--lw-border)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: 'var(--lw-text)',
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '11px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      lineHeight: 1.4,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--lw-accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--lw-border)'; }}
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
              metadata={m.metadata || {}}
            />
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ ...msgBubble('agent'), display: 'flex', gap: '4px', padding: '12px 16px' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--lw-accent-deep)',
                    animation: `bounce 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <ChatInput onSend={handleSend} onStop={handleStop} isSending={loading} disabled={loading} />
      </div>

      {/* ── Draggable FAB ── */}
      <button
        style={{
          ...fabStyle(open),
          right:  `${currentRight}px`,
          bottom: `${currentBottom}px`,
          cursor: dragState.current.dragging ? 'grabbing' : 'grab',
          transition: dragState.current.dragging
            ? 'none'
            : snapping
              ? 'all 0.22s cubic-bezier(0.2, 0.9, 0.2, 1)'
              : fabStyle(open).transition,
        }}
        onMouseDown={startDrag}
        onClick={() => {
          if (dragState.current.moved) return;
          setOpen(o => !o);
        }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {/* Aura glow */}
        <span aria-hidden="true" style={{
          position: 'absolute', inset: '-18px', borderRadius: '30px',
          background: 'radial-gradient(circle at 50% 50%, rgba(255,179,71,0.75) 0%, rgba(255,179,71,0.3) 55%, rgba(255,179,71,0) 85%)',
          filter: 'blur(9px)',
          opacity: open ? 1 : 0.92,
          animation: 'ai-aura 2.2s ease-in-out infinite, ai-glow 2.6s ease-in-out infinite',
          zIndex: 0, pointerEvents: 'none',
        }} />

        {/* Bubble hint */}
        {!open && (
          <div
            ref={bubbleRef}
            style={{
              position: 'absolute',
              right:  bubbleSide === 'right' ? 'auto' : '72px',
              left:   bubbleSide === 'right' ? '72px'  : 'auto',
              bottom: '6px',
              background: 'rgba(255,255,255,0.65)',
              border: '2px solid rgba(19,48,32,0.25)',
              borderRadius: '16px',
              padding: '9px 14px',
              fontFamily: "'Manrope', sans-serif",
              fontSize: '12px',
              color: 'var(--lw-text)',
              boxShadow: '0 12px 26px rgba(19,48,32,0.18)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              animation: `bubble-float 3s ease-in-out infinite, ${bubbleAnim} 0.22s ease`,
            }}
          >
            {BUBBLES[bubbleIndex]}
          </div>
        )}

        {/* Bot icon */}
        <span className="lw-ai-icon" style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: open ? 'var(--lw-sea-salt)' : '#ffd89b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--lw-dark)',
          animation: open
            ? 'ai-open 0.5s ease-out, ai-idle 2.8s ease-in-out infinite, ai-beat 1.8s ease-in-out infinite'
            : 'ai-idle 3.2s ease-in-out infinite, ai-beat 1.8s ease-in-out infinite',
          zIndex: 1,
        }}>
          <Bot size={16} strokeWidth={2.2} />
        </span>
      </button>

      <style>{`
        @keyframes bounce   { 0%,80%,100%{transform:translateY(0);opacity:.4}   40%{transform:translateY(-6px);opacity:1} }
        @keyframes ai-open  { 0%{transform:scale(.7) rotate(-18deg);opacity:.6} 60%{transform:scale(1.1) rotate(6deg);opacity:1} 100%{transform:scale(1) rotate(0deg)} }
        @keyframes ai-idle  { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-2px)} }
        @keyframes ai-beat  { 0%,100%{transform:scale(1)} 45%{transform:scale(1.06)} 60%{transform:scale(.98)} 75%{transform:scale(1.03)} }
        @keyframes ai-aura  { 0%,100%{transform:scale(.98);opacity:.6} 50%{transform:scale(1.12);opacity:1} }
        @keyframes ai-glow  { 0%,100%{filter:blur(6px)} 50%{filter:blur(14px)} }
        @keyframes bubble-float { 0%,100%{transform:translateY(0);opacity:.95}  50%{transform:translateY(-4px);opacity:1} }
        @keyframes bubble-in    { from{transform:translateY(6px) scale(.98);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
        @keyframes bubble-out   { from{transform:translateY(0) scale(1);opacity:1}     to{transform:translateY(-6px) scale(.98);opacity:0} }
        @keyframes pulse        { 0%,100%{opacity:1} 50%{opacity:.4} }
        .lw-ai-icon { transition: transform .2s ease, filter .2s ease; }
        button:hover .lw-ai-icon { transform: scale(1.08) rotate(-6deg); filter: drop-shadow(0 8px 12px rgba(255,179,71,.35)); }
      `}</style>
    </>
  );
}
