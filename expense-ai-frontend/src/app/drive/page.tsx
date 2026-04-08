'use client';

import { ArrowRight, CheckCircle2, ChevronRight, Clock3, File, Folder, FolderOpen, Grid3X3, LayoutDashboard, LayoutList, Loader2, LogOut, Search, Sparkles, WifiOff } from 'lucide-react';
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
const RETURNING_USER_KEY = 'lifewood-expense-ai-returning-user';

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

function getLatestModified(items: DriveItem[]): string | null {
  let latestTimestamp = 0;

  for (const item of items) {
    if (item.modifiedTime) {
      const parsed = Date.parse(item.modifiedTime);
      if (Number.isFinite(parsed)) {
        latestTimestamp = Math.max(latestTimestamp, parsed);
      }
    }

    if (item.children?.length) {
      const nestedLatest = getLatestModified(item.children);
      if (nestedLatest) {
        latestTimestamp = Math.max(latestTimestamp, Date.parse(nestedLatest));
      }
    }
  }

  return latestTimestamp ? new Date(latestTimestamp).toISOString() : null;
}

function formatRelativeTime(value: string | null): string {
  if (!value) return 'No recent activity';

  const diffMs = Date.now() - Date.parse(value);
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatAbsoluteDate(value: string | null): string {
  if (!value) return 'Waiting for first scan';

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function countItems(item: DriveItem): number {
  if (!item.children?.length) return 0;

  return item.children.reduce((total, child) => {
    if (isFolder(child)) {
      return total + 1 + countItems(child);
    }

    return total + 1;
  }, 0);
}

function getFolderHealth(item: DriveItem): { label: string; tone: 'healthy' | 'attention' } {
  const totalItems = countItems(item);

  if (totalItems >= 5) {
    return { label: 'Ready', tone: 'healthy' };
  }

  if (totalItems >= 1) {
    return { label: 'Needs uploads', tone: 'attention' };
  }

  return { label: 'Empty', tone: 'attention' };
}

export default function DrivePage() {
  const router = useRouter();
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [viewMode, setViewMode] = useState<'tiles' | 'content'>('tiles');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [userType, setUserType] = useState<'new' | 'returning'>('new');

  const deferredSearch = useDeferredValue(searchInput.trim().toLowerCase());

  useEffect(() => {
    setConnectionStatus(new URLSearchParams(window.location.search).get('status'));
  }, []);

  useEffect(() => {
    const isReturningUser = window.localStorage.getItem(RETURNING_USER_KEY) === '1';
    setUserType(isReturningUser ? 'returning' : 'new');
    window.localStorage.setItem(RETURNING_USER_KEY, '1');
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
  const latestModified = useMemo(() => getLatestModified(folders), [folders]);
  const rootFolders = useMemo(() => {
    if (!deferredSearch) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(deferredSearch));
  }, [deferredSearch, folders]);
  const activeFolder = rootFolders[0] ?? null;
  const foldersWithFiles = useMemo(
    () => folders.filter((folder) => (folder.children?.length ?? 0) > 0).length,
    [folders]
  );

  const greetingContent = useMemo(() => {
    if (userType === 'new') {
      return {
        header: 'Welcome to Expense AI',
        description:
          'Your AI workspace is ready. Connect a folder to start scanning receipts, organizing expenses, and tracking activity automatically.',
      };
    }

    return {
      header: 'Welcome back!',
      description:
        'Your Expense AI workspace is active. Continue reviewing scanned receipts and let AI keep your expenses organized in real time.',
    };
  }, [userType]);

  function openFolder(folderId: string) {
    router.push(`/drive/${folderId}`);
  }

  if (loading) {
    return (
      <main className={styles.pageShell}>
        <section className={`${styles.loadingState} ${styles.loadingStateNoAnim}`}>
          <h1>Loading your workspace</h1>
          <p>Syncing scanned folders from Google Drive&hellip;</p>
          <div className={styles.simpleLoader} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <WifiOff className={styles.mutedIcon} size={28} />
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
        {/* ── Brand ── */}
        <a className={styles.brand} href="/drive">
          <img alt="Lifewood" className={styles.brandLogo} src={LOGO_URL} />
          <span className={styles.brandSeparator} aria-hidden="true" />
          <span className={styles.brandBadge}>Expense AI</span>
        </a>

        {/* ── Centre nav ── */}
        <nav className={styles.topbarNav} />

        {/* ── Actions ── */}
        <div className={styles.topbarActions}>
          <a
            className={styles.navPill}
            href="/dashboard"
          >
            <LayoutDashboard className={styles.navIcon} size={14} />
            <span className={styles.navLabel}>AI Dashboard</span>
            <ArrowRight size={13} className={styles.navIcon} />
            <span className={styles.navActiveDot} aria-hidden="true" />
          </a>
          <div className={styles.syncBadge}>
            <span className={styles.syncPulse} aria-hidden="true" />
            <span>{folders.length} folder{folders.length !== 1 ? 's' : ''} synced</span>
          </div>
          <a className={styles.signOut} href="/">
            <LogOut size={14} />
            <span>Sign Out</span>
          </a>
        </div>
      </header>

      <div className={styles.pageContent}>

      {/* ── Hero banner ── */}
      <section className={styles.heroBanner}>
        <div className={styles.heroBannerLeft}>
          <span className={styles.heroTagline}>
            <span className={styles.heroTaglineOn}>ALWAYS ON</span><span className={styles.heroTaglineOff}>NEVER OFF</span>
          </span>
          <h1
            className={`${styles.greetingText} ${styles.greetingHeader} ${
              userType === 'new' ? styles.newUserHeaderIn : styles.returningUserHeaderIn
            }`}
          >
            {greetingContent.header}
          </h1>
          <p
            className={`${styles.heroSubtitle} ${styles.greetingDescription} ${
              userType === 'new' ? styles.newUserDescriptionIn : styles.returningUserDescriptionIn
            }`}
          >
            {greetingContent.description}
          </p>
        </div>
        <div className={styles.heroBannerRight}>
          <div className={styles.heroDetailCard}>
            <span>Last sync</span>
            <strong>{formatRelativeTime(latestModified)}</strong>
          </div>
          <div className={styles.heroDetailCard}>
            <span>Coverage</span>
            <strong>{foldersWithFiles}/{folders.length || 1}</strong>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className={styles.statsStrip}>
        <article className={styles.statItem}>
          <FolderOpen className={styles.statIcon} size={16} />
          <div>
            <strong>{folders.length}</strong>
            <span>Top-level scans</span>
          </div>
        </article>
        <span className={styles.statDivider} aria-hidden="true" />
        <article className={styles.statItem}>
          <Folder className={styles.statIcon} size={16} />
          <div>
            <strong>{stats.folderCount}</strong>
            <span>Nested folders</span>
          </div>
        </article>
        <span className={styles.statDivider} aria-hidden="true" />
        <article className={styles.statItem}>
          <File className={styles.statIcon} size={16} />
          <div>
            <strong>{stats.fileCount}</strong>
            <span>Files indexed</span>
          </div>
        </article>
        <span className={styles.statDivider} aria-hidden="true" />
        <article className={styles.statItem}>
          <Sparkles className={styles.statIcon} size={16} />
          <div>
            <strong>{rootFolders.length}</strong>
            <span>Review lanes</span>
          </div>
        </article>
        {activeFolder ? (
          <>
            <span className={styles.statDivider} aria-hidden="true" />
            <article className={styles.statItemAction}>
              <Clock3 className={styles.statIcon} size={16} />
              <div>
                <span>Suggested</span>
                <strong>{activeFolder.name}</strong>
              </div>
              <button
                className={styles.statButton}
                onClick={() => openFolder(activeFolder.id)}
                type="button"
              >
                Open <ArrowRight size={13} />
              </button>
            </article>
          </>
        ) : null}
      </section>

      {connectionStatus === 'success' ? (
        <section className={styles.statusBar}>
          <span className={styles.statusPill}><CheckCircle2 size={13} /> Connected</span>
          <p>Google Drive connected successfully. The scanned folders below are ready for review.</p>
        </section>
      ) : null}

      <section className={styles.controls}>
        <div className={styles.controlsIntro}>
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
            (() => {
              const directItems = folder.children?.length ?? 0;

              return (
                <button
                  className={`${styles.folderCard} ${styles[`stagger${i % 12}`]}`}
                  key={folder.id}
                  onClick={() => openFolder(folder.id)}
                  type="button"
                >
                  <div className={styles.folderCardTop}>
                    <span className={styles.folderIcon}><Folder size={18} /></span>
                  </div>
                  <div className={styles.folderCardBody}>
                    <h3>{folder.name}</h3>
                    <p className={styles.folderSummary}>
                      {directItems} item{directItems === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className={styles.folderLink}>Open <ChevronRight size={13} /></span>
                </button>
              );
            })()
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
      </div>
    </main>
  );
}
