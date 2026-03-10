'use client';

import { ChevronRight, CheckCircle2, File, Folder, FolderOpen, Grid3X3, LayoutList, Loader2, LogOut, Search, WifiOff } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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

const GREETINGS = ['Good day, admin', 'Welcome back, admin', 'Hello, admin'];

function useCyclingGreeting(intervalMs: number) {
  const [index, setIndex] = useState(0);
  const [animClass, setAnimClass] = useState('splitIn');

  useEffect(() => {
    const id = setInterval(() => {
      setAnimClass('splitOut');
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % GREETINGS.length);
        setAnimClass('splitIn');
      }, 500);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { greeting: GREETINGS[index], animClass };
}

export default function DrivePage() {
  const router = useRouter();
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [viewMode, setViewMode] = useState<'tiles' | 'content'>('tiles');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const { greeting, animClass } = useCyclingGreeting(15000);

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
          <Loader2 className={styles.spinner} size={32} />
          <h1>Loading your workspace</h1>
          <p>Syncing scanned folders from Google Drive&hellip;</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <WifiOff size={28} style={{ opacity: 0.6 }} />
          <h1>Unable to connect</h1>
          <p>{error}</p>
          <a className={styles.primaryAction} href="/">
            Return home
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
        <nav className={styles.topbarNav}>
          <span className={styles.navLabel}>Dashboard</span>
        </nav>
        <div className={styles.topbarActions}>
          <a className={styles.signOut} href="/">
            <LogOut size={14} />
            Sign Out
          </a>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCard}>
          <div className={styles.heroTicker} aria-label="Always on never off">
            <div className={styles.heroTickerTrack}>
              <span>Always On Never Off • Always On Never Off • Always On Never Off • Always On Never Off •</span>
              <span aria-hidden="true">Always On Never Off • Always On Never Off • Always On Never Off • Always On Never Off •</span>
            </div>
          </div>
          <h1 className={`${styles.greetingText} ${animClass === 'splitIn' ? styles.splitIn : styles.splitOut}`}>
            {greeting}
          </h1>
          <p>Select a scanned expense folder below to open its review workspace.</p>
        </div>
        <div className={styles.heroMetrics}>
          <article className={styles.metricCard}>
            <FolderOpen className={styles.metricIcon} size={18} />
            <span>Top-level scans</span>
            <strong>{folders.length}</strong>
          </article>
          <article className={styles.metricCard}>
            <Folder className={styles.metricIcon} size={18} />
            <span>Nested folders</span>
            <strong>{stats.folderCount}</strong>
          </article>
          <article className={styles.metricCard}>
            <File className={styles.metricIcon} size={18} />
            <span>Files indexed</span>
            <strong>{stats.fileCount}</strong>
          </article>
        </div>
      </section>

      {connectionStatus === 'success' ? (
        <section className={styles.statusBar}>
          <span className={styles.statusPill}><CheckCircle2 size={13} /> Connected</span>
          <p>Google Drive connected successfully. The scanned folders below are ready for review.</p>
        </section>
      ) : null}

      <section className={styles.controls}>
        <div>
          <h2>Expense Folders</h2>
          <p>{rootFolders.length} folder{rootFolders.length !== 1 ? 's' : ''} available</p>
        </div>
        <div className={styles.controlActions}>
          <label className={styles.searchBox}>
            <Search className={styles.searchIcon} size={15} />
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
              aria-label="Grid view"
            >
              <Grid3X3 size={15} />
            </button>
            <button
              className={viewMode === 'content' ? styles.viewToggleActive : ''}
              onClick={() => setViewMode('content')}
              type="button"
              aria-label="List view"
            >
              <LayoutList size={15} />
            </button>
          </div>
        </div>
      </section>

      {viewMode === 'tiles' ? (
        <section className={styles.folderGrid}>
          {rootFolders.map((folder, i) => (
            <button
              className={styles.folderCard}
              key={folder.id}
              onClick={() => openFolder(folder.id)}
              type="button"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className={styles.folderIcon}><Folder size={20} /></span>
              <h3>{folder.name}</h3>
              <p>{folder.children?.length ?? 0} items</p>
              <span className={styles.folderLink}>Open <ChevronRight size={14} /></span>
            </button>
          ))}
          {rootFolders.length === 0 && (
            <div className={styles.emptyState}>
              <Search size={32} />
              <p>No folders match your search.</p>
            </div>
          )}
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
              <span className={styles.folderListIcon}><Folder size={18} /></span>
              <div className={styles.folderListBody}>
                <strong>{folder.name}</strong>
                <span>{folder.children?.length ?? 0} items</span>
              </div>
              <ChevronRight size={16} className={styles.folderListArrow} />
            </button>
          ))}
          {rootFolders.length === 0 && (
            <div className={styles.emptyState}>
              <Search size={32} />
              <p>No folders match your search.</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
