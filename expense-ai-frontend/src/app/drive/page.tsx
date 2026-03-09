'use client';

import { startTransition, useDeferredValue, useEffect, useState } from 'react';
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

type SearchResult = {
  item: DriveItem;
  path: string[];
};

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

function isFolder(item: DriveItem): boolean {
  return item.mimeType === FOLDER_MIME_TYPE;
}

function formatFileSize(size?: string): string {
  if (!size) return 'Google Workspace';

  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(date?: string): string {
  if (!date) return 'No activity date';

  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getItemKind(item: DriveItem): string {
  if (isFolder(item)) return 'Folder';
  if (item.mimeType.includes('pdf')) return 'PDF';
  if (item.mimeType.includes('sheet') || item.mimeType.includes('excel')) return 'Spreadsheet';
  if (item.mimeType.includes('document') || item.mimeType.includes('word')) return 'Document';
  if (item.mimeType.includes('presentation') || item.mimeType.includes('powerpoint')) return 'Deck';
  if (item.mimeType.includes('image')) return 'Image';
  if (item.mimeType.includes('video')) return 'Video';
  if (item.mimeType.includes('audio')) return 'Audio';
  return 'File';
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

function findItemById(items: DriveItem[], id: string | null): DriveItem | null {
  if (!id) return null;

  for (const item of items) {
    if (item.id === id) return item;
    if (item.children?.length) {
      const match = findItemById(item.children, id);
      if (match) return match;
    }
  }

  return null;
}

function findPathToItem(items: DriveItem[], id: string, path: DriveItem[] = []): DriveItem[] | null {
  for (const item of items) {
    const nextPath = [...path, item];
    if (item.id === id) return nextPath;
    if (item.children?.length) {
      const nestedPath = findPathToItem(item.children, id, nextPath);
      if (nestedPath) return nestedPath;
    }
  }

  return null;
}

function collectSearchResults(items: DriveItem[], query: string, path: string[] = []): SearchResult[] {
  const matches: SearchResult[] = [];

  for (const item of items) {
    const currentPath = [...path, item.name];
    if (item.name.toLowerCase().includes(query)) {
      matches.push({ item, path: currentPath });
    }

    if (item.children?.length) {
      matches.push(...collectSearchResults(item.children, query, currentPath));
    }
  }

  return matches;
}

function FolderTree({
  items,
  expandedFolders,
  selectedId,
  onToggle,
  onSelect,
  depth = 0,
}: {
  items: DriveItem[];
  expandedFolders: Record<string, boolean>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  return (
    <div className={styles.treeGroup}>
      {items.filter(isFolder).map((item) => {
        const open = Boolean(expandedFolders[item.id]);
        const childFolders = (item.children ?? []).filter(isFolder);

        return (
          <div className={styles.treeNode} key={item.id}>
            <div
              className={`${styles.treeRow} ${selectedId === item.id ? styles.treeRowActive : ''}`}
              style={{ paddingLeft: `${16 + depth * 18}px` }}
            >
              <button
                aria-label={open ? `Collapse ${item.name}` : `Expand ${item.name}`}
                className={styles.treeToggle}
                onClick={() => onToggle(item.id)}
                type="button"
              >
                {childFolders.length > 0 ? (open ? 'v' : '>') : '-'}
              </button>
              <button
                className={styles.treeButton}
                onClick={() => onSelect(item.id)}
                type="button"
              >
                <span className={styles.treeLabel}>{item.name}</span>
                <span className={styles.treeCount}>{item.children?.length ?? 0}</span>
              </button>
            </div>
            {open && childFolders.length > 0 ? (
              <FolderTree
                depth={depth + 1}
                expandedFolders={expandedFolders}
                items={childFolders}
                onSelect={onSelect}
                onToggle={onToggle}
                selectedId={selectedId}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function DrivePage() {
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(searchInput.trim().toLowerCase());

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setConnectionStatus(params.get('status'));
  }, []);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const data = await driveService.listFiles();
        setFolders(data);

        if (data.length > 0) {
          setSelectedFolderId(data[0].id);
          setExpandedFolders({ [data[0].id]: true });
        }
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
  const selectedFolder = findItemById(folders, selectedFolderId) ?? folders[0] ?? null;
  const selectedPath = selectedFolder ? findPathToItem(folders, selectedFolder.id) ?? [selectedFolder] : [];
  const searchResults = deferredSearch ? collectSearchResults(folders, deferredSearch) : [];
  const recentFiles = (selectedFolder?.children ?? [])
    .slice()
    .sort((left, right) => {
      const leftTime = left.modifiedTime ? Date.parse(left.modifiedTime) : 0;
      const rightTime = right.modifiedTime ? Date.parse(right.modifiedTime) : 0;
      return rightTime - leftTime;
    })
    .slice(0, 5);

  function handleFolderSelect(id: string) {
    const path = findPathToItem(folders, id) ?? [];
    const nextExpanded = { ...expandedFolders };

    for (const item of path) {
      if (isFolder(item)) nextExpanded[item.id] = true;
    }

    setExpandedFolders(nextExpanded);
    startTransition(() => setSelectedFolderId(id));
  }

  function handleFolderToggle(id: string) {
    setExpandedFolders((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  if (loading) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingPanel}>
          <span className={styles.loadingEyebrow}>Google Drive Sync</span>
          <h1>Loading scanned Lifewood folders</h1>
          <p>We are preparing the latest folder structure from your connected workspace.</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.errorPanel}>
          <span className={styles.statusBadge}>Connection issue</span>
          <h1>Drive data is not available</h1>
          <p>{error}</p>
          <a className={styles.primaryLink} href="/">
            Return to connection page
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageShell}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>Lifewood Drive Console</span>
          <h1>Scanned Google Drive folders, organized for faster review.</h1>
          <p>
            Search the scanned tree, move through folder branches quickly, and open files from one
            responsive workspace.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryLink} href="/">
              Reconnect Drive
            </a>
            <span className={styles.heroHint}>Current view updates from the scanned Google Drive response.</span>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Top-level scans</span>
            <strong>{folders.length}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Nested folders</span>
            <strong>{stats.folderCount}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Files indexed</span>
            <strong>{stats.fileCount}</strong>
          </div>
        </div>
      </section>

      {connectionStatus === 'success' ? (
        <section className={styles.banner}>
          <span className={styles.bannerBadge}>Connected</span>
          <p>Google Drive connected successfully. Your scanned folders are ready to browse.</p>
        </section>
      ) : null}

      <section className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Search scanned folders and files</span>
          <input
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by folder or file name"
            type="search"
            value={searchInput}
          />
        </label>
        <div className={styles.toolbarMeta}>
          <span className={styles.statusBadge}>Always On Never Off</span>
          <span className={styles.toolbarNote}>Brand palette based on the 2024 Lifewood guide.</span>
        </div>
      </section>

      <section className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>Folder tree</span>
              <h2>Scanned sources</h2>
            </div>
            <span className={styles.panelMeta}>{folders.length} roots</span>
          </div>

          {folders.length > 0 ? (
            <FolderTree
              expandedFolders={expandedFolders}
              items={folders}
              onSelect={handleFolderSelect}
              onToggle={handleFolderToggle}
              selectedId={selectedFolder?.id ?? null}
            />
          ) : (
            <p className={styles.emptyState}>No folders containing Lifewood were found.</p>
          )}
        </aside>

        <div className={styles.content}>
          {deferredSearch ? (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Search results</span>
                  <h2>{searchResults.length} matches across the scanned tree</h2>
                </div>
              </div>

              {searchResults.length > 0 ? (
                <div className={styles.resultsGrid}>
                  {searchResults.map(({ item, path }) => (
                    <article className={styles.resultCard} key={item.id}>
                      <div className={styles.resultTopline}>
                        <span className={styles.kindPill}>{getItemKind(item)}</span>
                        <span className={styles.metaText}>{formatDate(item.modifiedTime)}</span>
                      </div>
                      <h3>{item.name}</h3>
                      <p>{path.join(' / ')}</p>
                      <div className={styles.cardActions}>
                        {isFolder(item) ? (
                          <button
                            className={styles.secondaryButton}
                            onClick={() => handleFolderSelect(item.id)}
                            type="button"
                          >
                            Open folder
                          </button>
                        ) : item.webViewLink ? (
                          <a className={styles.secondaryButton} href={item.webViewLink} rel="noreferrer" target="_blank">
                            Open file
                          </a>
                        ) : (
                          <span className={styles.metaText}>{formatFileSize(item.size)}</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyState}>No matching folders or files were found for that search.</p>
              )}
            </section>
          ) : selectedFolder ? (
            <>
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <span className={styles.panelEyebrow}>Current folder</span>
                    <h2>{selectedFolder.name}</h2>
                  </div>
                  <div className={styles.pathTrail}>
                    {selectedPath.map((item) => (
                      <button
                        className={`${styles.pathChip} ${item.id === selectedFolder.id ? styles.pathChipActive : ''}`}
                        key={item.id}
                        onClick={() => handleFolderSelect(item.id)}
                        type="button"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.selectionStats}>
                  <div className={styles.selectionStat}>
                    <span>Items</span>
                    <strong>{selectedFolder.children?.length ?? 0}</strong>
                  </div>
                  <div className={styles.selectionStat}>
                    <span>Folders</span>
                    <strong>{(selectedFolder.children ?? []).filter(isFolder).length}</strong>
                  </div>
                  <div className={styles.selectionStat}>
                    <span>Files</span>
                    <strong>{(selectedFolder.children ?? []).filter((item) => !isFolder(item)).length}</strong>
                  </div>
                </div>

                <div className={styles.childGrid}>
                  {(selectedFolder.children ?? []).map((item) => (
                    <article className={styles.childCard} key={item.id}>
                      <div className={styles.resultTopline}>
                        <span className={styles.kindPill}>{getItemKind(item)}</span>
                        <span className={styles.metaText}>{formatDate(item.modifiedTime)}</span>
                      </div>
                      <h3>{item.name}</h3>
                      <p>
                        {isFolder(item)
                          ? `${item.children?.length ?? 0} items inside`
                          : formatFileSize(item.size)}
                      </p>
                      <div className={styles.cardActions}>
                        {isFolder(item) ? (
                          <button
                            className={styles.primaryButton}
                            onClick={() => handleFolderSelect(item.id)}
                            type="button"
                          >
                            Explore
                          </button>
                        ) : item.webViewLink ? (
                          <a className={styles.primaryButton} href={item.webViewLink} rel="noreferrer" target="_blank">
                            Open in Drive
                          </a>
                        ) : (
                          <span className={styles.metaText}>Preview unavailable</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                {selectedFolder.children?.length ? null : (
                  <div className={styles.emptyStateBox}>
                    <span className={styles.kindPill}>Empty scan result</span>
                    <h3>No visible child items</h3>
                    <p className={styles.emptyState}>
                      This folder was scanned successfully, but the current API response does not
                      include nested files for this branch.
                    </p>
                  </div>
                )}
              </section>

              <section className={styles.insightsPanel}>
                <div className={styles.insightCard}>
                  <span className={styles.panelEyebrow}>Selection summary</span>
                  <h3>{(selectedFolder.children ?? []).filter(isFolder).length} child folders</h3>
                  <p>Use the left tree to move deeper into the scanned Google Drive structure.</p>
                </div>
                <div className={styles.insightCard}>
                  <span className={styles.panelEyebrow}>Recent activity</span>
                  <h3>{recentFiles.length} recent items</h3>
                  <ul className={styles.recentList}>
                    {recentFiles.map((item) => (
                      <li key={item.id}>
                        <span>{item.name}</span>
                        <span>{formatDate(item.modifiedTime)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </>
          ) : (
            <section className={styles.panel}>
              <p className={styles.emptyState}>No scanned folders are available yet.</p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
