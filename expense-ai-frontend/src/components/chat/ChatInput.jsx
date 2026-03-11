import { useState, useRef, useEffect } from 'react';

/**
 * ChatInput
 *
 * Props:
 *   onSend     (message: string) => void
 *   disabled   boolean
 *   placeholder string (optional)
 *   maxRows    number (optional, default 4)
 */
export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask about your expenses…',
  maxRows = 4,
}) {
  const [value,   setValue]   = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef           = useRef(null);

  // Auto-grow textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight  = 20;
    const paddingY    = 20; // 10px top + 10px bottom
    const maxHeight   = lineHeight * maxRows + paddingY;
    el.style.height   = Math.min(el.scrollHeight, maxHeight) + 'px';
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value, maxRows]);

  const canSend = value.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid #1f2937',
      background: '#0a0e1a',
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-end',
    }}>
      {/* Textarea wrapper with focus ring */}
      <div style={{
        flex: 1,
        position: 'relative',
        borderRadius: '10px',
        border: `1px solid ${focused ? 'rgba(245,158,11,0.4)' : '#1f2937'}`,
        transition: 'border-color 0.15s',
        background: '#111827',
      }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '10px 14px',
            color: disabled ? '#4b5563' : '#f9fafb',
            fontFamily: "'Syne', sans-serif",
            fontSize: '13px',
            lineHeight: '20px',
            display: 'block',
            boxSizing: 'border-box',
          }}
        />

        {/* Shift+Enter hint — only shown when focused and multiline */}
        {focused && value.includes('\n') && (
          <div style={{
            position: 'absolute',
            bottom: '6px',
            right: '10px',
            fontFamily: "'Syne', sans-serif",
            fontSize: '10px',
            color: '#4b5563',
            pointerEvents: 'none',
          }}>
            Shift+Enter for newline
          </div>
        )}
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        title={canSend ? 'Send message (Enter)' : 'Type a message first'}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: canSend
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : '#1f2937',
          border: 'none',
          cursor: canSend ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: canSend ? 'scale(1)' : 'scale(0.95)',
          boxShadow: canSend ? '0 4px 12px rgba(245,158,11,0.3)' : 'none',
        }}
        onMouseEnter={e => canSend && (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = canSend ? 'scale(1)' : 'scale(0.95)')}
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke={canSend ? '#0a0e1a' : '#4b5563'}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </div>
  );
}