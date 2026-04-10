'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ── Speech Recognition state machine ──────────────────────────────────────
// idle → requesting → listening → transcribing → idle
// idle → unsupported (terminal)
// idle → denied     (terminal, but user can retry)

const MIC_STATES = {
  IDLE:          'idle',
  REQUESTING:    'requesting',
  LISTENING:     'listening',
  TRANSCRIBING:  'transcribing',
  DENIED:        'denied',
  UNSUPPORTED:   'unsupported',
};

const MIC_LABELS = {
  [MIC_STATES.IDLE]:         'Use microphone',
  [MIC_STATES.REQUESTING]:   'Requesting mic…',
  [MIC_STATES.LISTENING]:    'Listening… (click to stop)',
  [MIC_STATES.TRANSCRIBING]: 'Transcribing…',
  [MIC_STATES.DENIED]:       'Mic access denied — click to retry',
  [MIC_STATES.UNSUPPORTED]:  'Voice not supported in this browser',
};

// ── Icon components ────────────────────────────────────────────────────────
function MicIcon({ color = 'currentColor' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8"  y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function MicOffIcon({ color = 'currentColor' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8"  y1="23" x2="16" y2="23"/>
    </svg>
  );
}

function StopIcon({ color = 'currentColor' }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={color} stroke="none">
      <rect x="4" y="4" width="16" height="16" rx="3"/>
    </svg>
  );
}

// ── Pulsing ring animation (shown while listening) ─────────────────────────
function PulseRing() {
  return (
    <span style={{
      position: 'absolute',
      inset: '-4px',
      borderRadius: '50%',
      border: '2px solid rgba(255,80,80,0.5)',
      animation: 'mic-pulse 1.2s ease-out infinite',
      pointerEvents: 'none',
    }} />
  );
}

export default function ChatInput({
  onSend,
  onStop,
  isSending   = false,
  disabled    = false,
  placeholder = 'Ask about your finances...',
  maxRows     = 4,
}) {
  const [value,      setValue]      = useState('');
  const [focused,    setFocused]    = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [micState,   setMicState]   = useState(MIC_STATES.IDLE);
  const [interimText, setInterimText] = useState(''); // live partial transcript

  const textareaRef  = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 20 * maxRows + 20;
    el.style.height    = Math.min(el.scrollHeight, maxHeight) + 'px';
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value, maxRows]);

  // ── Cleanup preview URL ──────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl); };
  }, [attachment]);

  // ── Cleanup recognition on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  // ── Check browser support once ───────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) setMicState(MIC_STATES.UNSUPPORTED);
  }, []);

  // ── Start voice recognition ───────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setMicState(MIC_STATES.UNSUPPORTED); return; }

    setMicState(MIC_STATES.REQUESTING);
    setInterimText('');

    const recognition = new SpeechRecognition();
    recognition.continuous      = false;   // single utterance
    recognition.interimResults  = true;    // show live partial text
    recognition.lang            = 'en-PH'; // Filipino English; fallback to en-US automatically
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setMicState(MIC_STATES.LISTENING);

    recognition.onresult = (event) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final   += transcript;
        else                          interim += transcript;
      }
      setInterimText(interim);
      if (final) {
        setValue(prev => {
          const joined = prev.trim() ? `${prev.trim()} ${final.trim()}` : final.trim();
          return joined;
        });
        setInterimText('');
      }
    };

    recognition.onend = () => {
      // Only reset to idle if we didn't already set a terminal state
      setMicState(s =>
        s === MIC_STATES.LISTENING || s === MIC_STATES.TRANSCRIBING
          ? MIC_STATES.IDLE
          : s
      );
      setInterimText('');
      recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
      const err = event.error;
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setMicState(MIC_STATES.DENIED);
      } else if (err === 'network') {
        setMicState(MIC_STATES.IDLE);
      } else if (err === 'no-speech') {
        // Treat silence as cancelled — go back to idle quietly
        setMicState(MIC_STATES.IDLE);
      } else {
        setMicState(MIC_STATES.IDLE);
      }
      setInterimText('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  // ── Stop voice recognition ────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      setMicState(MIC_STATES.TRANSCRIBING);
      recognitionRef.current.stop();
    }
  }, []);

  // ── Mic button click handler ──────────────────────────────────────────────
  const handleMicClick = useCallback(() => {
    if (micState === MIC_STATES.LISTENING) {
      stopListening();
    } else if (
      micState === MIC_STATES.IDLE ||
      micState === MIC_STATES.DENIED
    ) {
      // If DENIED, try again — browser may prompt again
      if (micState === MIC_STATES.DENIED) setMicState(MIC_STATES.IDLE);
      startListening();
    }
    // REQUESTING / TRANSCRIBING / UNSUPPORTED → do nothing (button disabled)
  }, [micState, startListening, stopListening]);

  // ── File attachment ────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment({ file, previewUrl: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const canSend = (value.trim().length > 0 || attachment) && !disabled && !isSending;

  const handleSend = () => {
    if (!canSend) return;
    // Stop any active recognition before sending
    if (recognitionRef.current) recognitionRef.current.abort();
    setMicState(MIC_STATES.IDLE);
    setInterimText('');
    onSend(value.trim(), attachment?.file || null);
    setValue('');
    setAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Derived mic button appearance ─────────────────────────────────────────
  const isListening    = micState === MIC_STATES.LISTENING;
  const isBusy         = micState === MIC_STATES.REQUESTING || micState === MIC_STATES.TRANSCRIBING;
  const isUnsupported  = micState === MIC_STATES.UNSUPPORTED;
  const isDenied       = micState === MIC_STATES.DENIED;

  const micBg = isListening
    ? 'rgba(220,38,38,0.12)'          // red tint when recording
    : isDenied
      ? 'rgba(193,113,16,0.12)'       // amber tint when denied
      : 'var(--lw-surface-alt)';

  const micBorder = isListening
    ? '1px solid rgba(220,38,38,0.35)'
    : isDenied
      ? '1px solid rgba(193,113,16,0.3)'
      : '1px solid var(--glass-border)';

  const micIconColor = isListening
    ? 'rgb(220,38,38)'
    : isDenied
      ? '#C17110'
      : isUnsupported
        ? 'var(--lw-muted)'
        : 'var(--lw-muted)';

  // ── Display text: combine committed value + interim partial ───────────────
  const displayValue = value + (interimText ? ` ${interimText}` : '');

  return (
    <div style={{
      borderTop: '1px solid var(--glass-border)',
      background: 'linear-gradient(180deg, rgba(255,228,190,0.85) 0%, rgba(255,242,220,0.95) 100%)',
    }}>
      {/* ── Listening indicator banner ── */}
      {isListening && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'rgba(220,38,38,0.08)',
          borderBottom: '1px solid rgba(220,38,38,0.15)',
        }}>
          {/* Animated sound-wave bars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '14px' }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{
                width: '3px',
                background: 'rgb(220,38,38)',
                borderRadius: '2px',
                animation: `mic-wave 0.8s ${i * 0.12}s ease-in-out infinite`,
              }} />
            ))}
          </div>
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '11px',
            fontWeight: 700,
            color: 'rgb(220,38,38)',
          }}>
            Listening…
          </span>
          {interimText && (
            <span style={{
              fontFamily: "'Manrope', sans-serif",
              fontSize: '11px',
              color: 'rgba(220,38,38,0.7)',
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '200px',
            }}>
              "{interimText}"
            </span>
          )}
          <span style={{
            marginLeft: 'auto',
            fontFamily: "'Manrope', sans-serif",
            fontSize: '10px',
            color: 'rgba(220,38,38,0.6)',
          }}>
            Click mic to stop
          </span>
        </div>
      )}

      {/* ── Transcribing indicator ── */}
      {micState === MIC_STATES.TRANSCRIBING && (
        <div style={{
          padding: '5px 14px',
          background: 'rgba(255,179,71,0.1)',
          borderBottom: '1px solid rgba(255,179,71,0.2)',
          fontFamily: "'Manrope', sans-serif",
          fontSize: '11px',
          color: 'var(--lw-accent-deep)',
          fontWeight: 600,
        }}>
          Processing speech…
        </div>
      )}

      {/* ── Denied / unsupported notice ── */}
      {(isDenied || isUnsupported) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 14px',
          background: isDenied ? 'rgba(193,113,16,0.08)' : 'rgba(112,142,124,0.08)',
          borderBottom: `1px solid ${isDenied ? 'rgba(193,113,16,0.2)' : 'rgba(112,142,124,0.2)'}`,
        }}>
          <MicOffIcon color={isDenied ? '#C17110' : 'var(--lw-muted)'} />
          <span style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: '11px',
            color: isDenied ? '#C17110' : 'var(--lw-muted)',
            flex: 1,
          }}>
            {isUnsupported
              ? 'Voice input is not supported in this browser. Please use Chrome or Edge.'
              : 'Microphone access was denied. Click the mic button to try again, or type your message.'}
          </span>
          {isDenied && (
            <button
              onClick={() => setMicState(MIC_STATES.IDLE)}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '11px',
                color: '#C17110', fontWeight: 700,
                textDecoration: 'underline', padding: '0',
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* ── Attachment preview chip ── */}
      {attachment && (
        <div style={{ display: 'flex', padding: '8px 12px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--lw-surface-alt)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px', padding: '6px 10px',
          }}>
            <img
              src={attachment.previewUrl} alt="receipt"
              style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            <span style={{
              fontFamily: "'Manrope', sans-serif", fontSize: '11px',
              color: 'var(--lw-text)', fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', maxWidth: '180px',
            }}>
              {attachment.file.name}
            </span>
            <button onClick={removeAttachment}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lw-muted)', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}>
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Input row ── */}
      <div style={{ padding: '10px 12px', display: 'flex', gap: '6px', alignItems: 'flex-end' }}>

        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*,.pdf"
          onChange={handleFileChange} style={{ display: 'none' }} />

        {/* Paperclip button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending || disabled}
          title="Attach receipt image"
          style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: attachment ? 'var(--lw-accent)' : 'var(--lw-surface-alt)',
            border: '1px solid var(--glass-border)',
            cursor: isSending || disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
            opacity: isSending || disabled ? 0.5 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={attachment ? 'var(--lw-dark)' : 'var(--lw-muted)'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>

        {/* Text area */}
        <div style={{
          flex: 1, position: 'relative', borderRadius: '10px',
          border: `1px solid ${focused ? 'var(--lw-accent)' : isListening ? 'rgba(220,38,38,0.4)' : 'var(--glass-border)'}`,
          transition: 'border-color 0.15s',
          background: isListening ? 'rgba(255,255,255,0.9)' : 'var(--lw-surface-alt)',
        }}>
          <textarea
            ref={textareaRef}
            value={displayValue}
            onChange={e => {
              // When voice is active, strip the interim text suffix
              // When typing normally, use value as-is (trimEnd breaks spacebar)
              if (interimText) {
                setValue(e.target.value.replace(interimText, '').trimEnd());
              } else {
                setValue(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              isListening
                ? 'Speak now…'
                : attachment
                  ? 'Which folder? e.g. "Admin Finance" or "create VIP Preparation folder"'
                  : placeholder
            }
            disabled={disabled || isSending}
            rows={1}
            style={{
              width: '100%', background: 'transparent',
              border: 'none', outline: 'none', resize: 'none',
              padding: '10px 14px',
              color: isListening && interimText
                ? 'rgba(19,48,32,0.5)'   // dim interim text slightly
                : disabled ? 'var(--lw-muted)' : 'var(--lw-text)',
              fontFamily: "'Manrope', sans-serif",
              fontSize: '13px', lineHeight: '20px',
              display: 'block', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Mic button */}
        <button
          onClick={handleMicClick}
          disabled={isBusy || isUnsupported || isSending || disabled}
          title={MIC_LABELS[micState]}
          style={{
            position: 'relative',
            width: '34px', height: '34px', borderRadius: '50%',
            background: micBg,
            border: micBorder,
            cursor: isBusy || isUnsupported ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.2s',
            opacity: (isBusy || isUnsupported) ? 0.5 : 1,
          }}
        >
          {isListening && <PulseRing />}
          {isListening
            ? <StopIcon color="rgb(220,38,38)" />
            : isDenied
              ? <MicOffIcon color="#C17110" />
              : <MicIcon color={micIconColor} />
          }
        </button>

        {/* Send / Stop button */}
        <button
          onClick={isSending ? onStop : handleSend}
          disabled={isSending ? false : !canSend}
          title={isSending ? 'Stop' : canSend ? 'Send (Enter)' : 'Type or speak a message'}
          style={{
            width: '34px', height: '34px', borderRadius: '10px',
            background: isSending ? 'var(--lw-earth)' : canSend ? 'var(--lw-accent)' : 'var(--lw-surface-alt)',
            border: '1px solid var(--glass-border)',
            cursor: isSending || canSend ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
            boxShadow: canSend && !isSending ? '0 6px 14px rgba(255,179,71,0.28)' : 'none',
          }}
        >
          {isSending ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="var(--lw-white)" strokeWidth="2.5" strokeLinecap="round">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke={canSend ? 'var(--lw-dark)' : 'var(--lw-muted)'}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Animations ── */}
      <style>{`
        @keyframes mic-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes mic-wave {
          0%, 100% { height: 4px; }
          50%       { height: 14px; }
        }
      `}</style>
    </div>
  );
}
