'use client';

import { driveService } from '../services/driveService';
import styles from './page.module.css';

const LOGO_URL =
  'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png';

export default function HomePage() {
  const handleConnect = async () => {
    const url = await driveService.getAuthUrl();
    window.location.href = url;
  };

  return (
    <main className={styles.pageShell}>
      <section className={styles.card}>
        <div className={styles.header}>
          <img alt="Lifewood" className={styles.logo} src={LOGO_URL} />
          <span className={styles.badge}>Always On Never Off</span>
        </div>
        <div className={styles.copy}>
          <span className={styles.kicker}>Expense workspace</span>
          <h1>Expense AI</h1>
          <p>Connect Google Drive to open your Lifewood review dashboard.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={handleConnect} type="button">
            Connect Google Drive
          </button>
          <a className={styles.secondaryButton} href="/drive">
            Open Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
