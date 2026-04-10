'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import ChatPanel from './ChatPanel';

export default function SharedChatbot() {
  const [convId, setConvId] = useState(null);
  const pathname = usePathname();

  if (pathname === '/') {
    return null;
  }

  return (
    <>
      <ChatPanel
        conversationId={convId}
        onConversationCreate={setConvId}
      />

      <style>{`
        :root {
          --lw-white: #ffffff;
          --lw-sea-salt: #F9F7F7;
          --lw-dark: #133020;
          --lw-green: #046241;
          --lw-accent: #FFB347;
          --lw-accent-deep: #C17110;
          --lw-border: rgba(19,48,32,0.12);
          --lw-muted: #708E7C;
          --lw-text: #133020;
          --lw-shadow-soft: 0 18px 40px rgba(19,48,32,0.12);
          --glass-bg-strong: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 100%);
          --glass-border: rgba(255,255,255,0.65);
          --glass-shadow: 0 18px 45px rgba(19,48,32,0.16);
          --lw-chat-width: 380px;
          --lw-chat-height: 580px;
          --lw-chat-right: 28px;
          --lw-chat-bottom: 96px;
          --lw-fab-right: 28px;
          --lw-fab-bottom: 28px;
        }

        @media (max-width: 900px) {
          :root {
            --lw-chat-width: 320px;
            --lw-chat-height: 520px;
            --lw-chat-right: 16px;
            --lw-chat-bottom: 84px;
            --lw-fab-right: 16px;
            --lw-fab-bottom: 16px;
          }
        }

        @media (max-width: 600px) {
          :root {
            --lw-chat-width: calc(100vw - 32px);
            --lw-chat-height: 70vh;
          }
        }
      `}</style>
    </>
  );
}
