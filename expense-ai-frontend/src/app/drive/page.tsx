'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { driveService } from '../../services/driveService';
import styles from './page.module.css';

type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  children?: DriveItem[];
};

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const LOGO_URL =
  'https://framerusercontent.com/images/BZSiFYgRc4wDUAuEybhJbZsIBQY.png';

function isFolder(item: DriveItem): boolean {
  return item.mimeType === FOLDER_MIME_TYPE;
}

function summarizeTree(items: DriveItem[]) {
  let folderCount = 0;
  let fileCount = 0;

  for (const item of items) {
    if (isFolder(item)) {
      folderCount += 1;
      const nested = summarizeTree(item.children ?? []);
      folderCount += nested.folderCount;
      fileCount += nested.fileCount;
    } else {
      fileCount += 1;
    }
  }

  return { folderCount, fileCount };
}

export default function DrivePage() {
  const router = useRouter();
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [viewMode, setViewMode] = useState<'tiles' | 'content'>('tiles');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(searchInput.trim().toLowerCase());

  useEffect(() => {
    setConnectionStatus(new URLSearchParams(window.location.search).get('status'));
  }, []);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await driveService.listFiles();
        setFolders(data);
        setError(null);
      } catch (err) {
        setError('Failed to load scanned Google Drive folders.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const stats = summarizeTree(folders);
  const rootFolders = useMemo(() => {
    if (!deferredSearch) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(deferredSearch));
  }, [deferredSearch, folders]);

  function openFolder(folderId: string) {
    router.push(`/drive/${folderId}`);
  }

  if (loading) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <span className={styles.badge}>Drive Sync</span>
          <h1>Loading scanned folders</h1>
          <p>Preparing your Lifewood Google Drive dashboard.</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <span className={styles.badge}>Connection issue</span>
          <h1>Drive data is not available</h1>
          <p>{error}</p>
          <a className={styles.primaryAction} href="/">
            Return to landing page
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageShell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/drive">
          <img alt="Lifewood" className={styles.brandLogo} src={LOGO_URL} />
        </a>
        <div className={styles.topbarActions}>
          <a className={styles.signOut} href="/">
            Sign Out
          </a>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCard}>
          <span className={styles.badge}>Always On Never Off</span>
          <h1>
            Good day, <em>admin</em>
          </h1>
          <p>Choose a scanned expense folder to open its Lifewood review workspace.</p>
        </div>
        <div className={styles.heroMetrics}>
          <article className={styles.metricCard}>
            <span>Top-level scans</span>
            <strong>{folders.length}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Nested folders</span>
            <strong>{stats.folderCount}</strong>
          </article>
          <article className={styles.metricCard}>
            <span>Files indexed</span>
            <strong>{stats.fileCount}</strong>
          </article>
        </div>
      </section>

      {connectionStatus === 'success' ? (
        <section className={styles.statusBar}>
          <span className={styles.statusPill}>Connected</span>
          <p>Google Drive connected successfully. The scanned folders below are ready for review.</p>
        </section>
      ) : null}

      <section className={styles.controls}>
        <div>
          <h2>Expense Folders</h2>
          <p>Scanned Google Drive folders prepared for review.</p>
        </div>
        <div className={styles.controlActions}>
          <label className={styles.searchBox}>
            <span className={styles.searchIcon}>o</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search folders..."
              type="search"
              value={searchInput}
            />
          </label>
          <div className={styles.viewToggle}>
            <button
              className={viewMode === 'tiles' ? styles.viewToggleActive : ''}
              onClick={() => setViewMode('tiles')}
              type="button"
            >
              Tiles
            </button>
            <button
              className={viewMode === 'content' ? styles.viewToggleActive : ''}
              onClick={() => setViewMode('content')}
              type="button"
            >
              Content
            </button>
          </div>
        </div>
      </section>

      {viewMode === 'tiles' ? (
        <section className={styles.folderGrid}>
          {rootFolders.map((folder) => (
            <button
              className={styles.folderCard}
              key={folder.id}
              onClick={() => openFolder(folder.id)}
              type="button"
            >
              <span className={styles.folderIcon}>[]</span>
              <h3>{folder.name}</h3>
              <p>{folder.children?.length ?? 0} scanned items</p>
              <span className={styles.folderLink}>Open Folder</span>
            </button>
          ))}
        </section>
      ) : (
        <section className={styles.folderList}>
          {rootFolders.map((folder) => (
            <button
              className={styles.folderListRow}
              key={folder.id}
              onClick={() => openFolder(folder.id)}
              type="button"
            >
              <span className={styles.folderListIcon}>[]</span>
              <div className={styles.folderListBody}>
                <strong>{folder.name}</strong>
                <span>Open folder content</span>
              </div>
              <div className={styles.folderListMeta}>
                <span>{folder.children?.length ?? 0} items</span>
                <span>Open</span>
              </div>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
