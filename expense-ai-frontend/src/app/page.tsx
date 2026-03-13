'use client';

import { CheckCircle2, Clock, Shield, TrendingUp } from 'lucide-react';
import { driveService } from '../services/driveService';
import styles from './page.module.css';

const LOGO_URL =
  'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png';

const FEATURES = [
  { icon: CheckCircle2, text: 'Auto Categorize' },
  { icon: Clock,         text: 'Real-Time Tracking' },
  { icon: TrendingUp,    text: 'Smart Reports' },
];

export default function HomePage() {
  const handleConnect = async () => {
    const url = await driveService.getAuthUrl();
    window.location.href = url;
  };

  return (
    <div className={styles.shell}>

      {/* ── Left panel ─────────────────────────────────────────── */}
      <div className={styles.leftPanel}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <img alt="Lifewood" className={styles.logo} src={LOGO_URL} />
        </div>

        {/* Content */}
        <div className={styles.content}>
          <span className={styles.kicker}>—Expense workspace—</span>
          <h1 className={styles.heading}>Expense AI</h1>
          <p className={styles.desc}>
            Connect Google Drive to open your Lifewood review dashboard.
          </p>
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={handleConnect} type="button">
              Connect Google Drive
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <Shield size={14} />
            <span>Secure employee access</span>
          </div>
          <span>&copy; {new Date().getFullYear()} Lifewood</span>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className={styles.rightPanel}>
        {/* Background image */}
        <div className={styles.bgImage} />

        {/* Overlay content */}
        <div className={styles.overlay}>
          {/* Top badge */}
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeAlwaysOn}>ALWAYS ON</span>
            <span className={styles.heroBadgeNeverOff}>NEVER OFF</span>
          </div>

          {/* Hero text */}
          <div className={styles.heroText}>
            <h2>
              Expense AI<br />
              Intelligence<br />
              <span className={styles.accent}>Assistant</span>
            </h2>
            <p>
              AI powered receipt scanning, automated categorization,
              and real time tracking, all in one clean workspace.
            </p>
          </div>

          {/* Feature tags */}
          <div className={styles.featureTags}>
            {FEATURES.map(({ icon: Ic, text }) => (
              <div key={text} className={styles.featureTag}>
                <Ic className={styles.featureIcon} size={14} />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
