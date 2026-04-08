'use client';

import type { ChangeEvent } from 'react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { driveService } from '../../../services/driveService';
import styles from '../page.module.css';

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

function getDisplayName(item: DriveItem): string {
  if (isFolder(item)) return item.name;
  const trimmed = item.name.trim();
  const dotIndex = trimmed.lastIndexOf('.');
  return dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
}

function getItemKind(item: DriveItem): string {
  if (isFolder(item)) return 'Folder';
  if (item.mimeType.includes('pdf')) return 'PDF';
  if (item.mimeType.includes('sheet') || item.mimeType.includes('excel')) return 'Spreadsheet';
  if (item.mimeType.includes('document') || item.mimeType.includes('word')) return 'Document';
  if (item.mimeType.includes('presentation') || item.mimeType.includes('powerpoint')) return 'Deck';
  if (item.mimeType.includes('image')) return 'Image';
  return 'File';
}

function isImage(item: DriveItem): boolean {
  return item.mimeType.includes('image');
}

function getActionLabel(item: DriveItem): string {
  return isFolder(item) ? 'Open folder' : 'View content';
}

function formatDate(date?: string): string {
  if (!date) return 'No activity date';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFileSize(size?: string): string {
  if (!size) return 'Google Workspace';
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function findItemById(items: DriveItem[], id: string | null): DriveItem | null {
  if (!id) return null;

  for (const item of items) {
    if (item.id === id) return item;
    if (item.children?.length) {
      const nested = findItemById(item.children, id);
      if (nested) return nested;
    }
  }

  return null;
}

function findDirectChild(folder: DriveItem | null, matcher: (item: DriveItem) => boolean): DriveItem | null {
  if (!folder?.children?.length) return null;
  return folder.children.find(matcher) ?? null;
}

function insertChildIntoFolder(items: DriveItem[], folderId: string, child: DriveItem): DriveItem[] {
  return items.map((item) => {
    if (item.id === folderId) {
      const children = item.children ?? [];
      const exists = children.some((existingChild) => existingChild.id === child.id);
      return { ...item, children: exists ? children : [child, ...children] };
    }

    if (item.children?.length) {
      return { ...item, children: insertChildIntoFolder(item.children, folderId, child) };
    }

    return item;
  });
}

function removeItemFromTree(items: DriveItem[], itemId: string): DriveItem[] {
  return items
    .filter((item) => item.id !== itemId)
    .map((item) => ({
      ...item,
      children: item.children ? removeItemFromTree(item.children, itemId) : item.children,
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function FolderWorkspacePage() {
  const { folderId } = useParams<{ folderId: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(searchInput.trim().toLowerCase());

  async function fetchFiles() {
    try {
      const data = await driveService.listFiles();
      setFolders(data);
      setError(null);
      setUploadError(null);
      return data;
    } catch (err) {
      setError('Failed to load scanned Google Drive folders.');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function pollForUploadedItem(
    targetFolderId: string,
    matcher: (item: DriveItem) => boolean,
    attempts = 6,
    intervalMs = 700
  ) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const data = await fetchFiles();
      const refreshedFolder = data ? findItemById(data, targetFolderId) : null;
      const uploadedItem = findDirectChild(refreshedFolder, matcher);

      if (uploadedItem) {
        return { data, uploadedItem };
      }

      if (attempt < attempts - 1) {
        await delay(intervalMs);
      }
    }

    return { data: null, uploadedItem: null };
  }

  useEffect(() => {
    fetchFiles();
  }, []);

  const selectedFolder = findItemById(folders, folderId) ?? null;
  const selectedContents = useMemo(() => {
    if (!selectedFolder) return [];
    const children = selectedFolder.children ?? [];
    if (!deferredSearch) return children;
    return children.filter((item) => item.name.toLowerCase().includes(deferredSearch));
  }, [deferredSearch, selectedFolder]);

  function openPreview(item: DriveItem) {
    if (!item.webViewLink || isFolder(item)) return;
    setPreviewItem(item);
  }

  function handleUploadClick() {
    if (!selectedFolder?.id || uploading) return;
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedFolder?.id) return;
    const targetFolderId = selectedFolder.id;
    const normalizedName = file.name.trim().toLowerCase();
    const matchesUpload = (item: DriveItem) => item.name.trim().toLowerCase() === normalizedName;

    try {
      setUploading(true);
      setUploadError(null);
      const uploadedItem = await driveService.uploadFileToFolder(targetFolderId, file);

      setFolders((currentFolders) =>
        insertChildIntoFolder(currentFolders, targetFolderId, {
          ...uploadedItem,
          children: uploadedItem.children ?? [],
        })
      );

      const { data, uploadedItem: confirmedItem } = await pollForUploadedItem(targetFolderId, matchesUpload);

      if (!confirmedItem) {
        if (data) {
          setFolders(data);
        }
        setUploadError('Upload finished, but the new file is still syncing from Google Drive.');
      }
    } catch (uploadErr) {
      const { data, uploadedItem } = await pollForUploadedItem(targetFolderId, matchesUpload);

      if (uploadedItem) {
        if (data) {
          setFolders(data);
        }
        setUploadError(null);
      } else {
        const message = uploadErr instanceof Error ? uploadErr.message : 'Failed to upload file';
        setUploadError(message);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteItem(item: DriveItem) {
    const confirmed = window.confirm(`Delete "${getDisplayName(item)}" from Google Drive?`);
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      setUploadError(null);
      await driveService.deleteFile(item.id);
      setFolders((currentFolders) => removeItemFromTree(currentFolders, item.id));

      if (previewItem?.id === item.id) {
        setPreviewItem(null);
      }

      setTimeout(() => {
        fetchFiles();
      }, 800);
    } catch (deleteErr) {
      const message = deleteErr instanceof Error ? deleteErr.message : 'Failed to delete file';
      setUploadError(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <span className={styles.badge}>Drive Sync</span>
          <h1>Loading folder workspace</h1>
          <p>Preparing the selected Google Drive folder.</p>
        </section>
      </main>
    );
  }

  if (error || !selectedFolder) {
    return (
      <main className={styles.pageShell}>
        <section className={styles.loadingState}>
          <span className={styles.badge}>Connection issue</span>
          <h1>Folder data is not available</h1>
          <p>{error ?? 'The selected folder could not be found.'}</p>
          <a className={styles.primaryAction} href="/drive">
            Return to folders
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

      <div className={styles.pageContent}>
        <input
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
        className={styles.hiddenInput}
        onChange={handleFileSelected}
        ref={fileInputRef}
        title="Upload receipt file"
        type="file"
        />

      <section className={styles.workspaceShell}>
        <div className={styles.workspaceToolbar}>
          <div className={styles.workspaceHeader}>
            <div className={styles.workspaceTitleRow}>
              <button className={styles.backButton} onClick={() => router.push('/drive')} type="button">
                &lt;
              </button>
              <span className={styles.titleAccent} />
              <h2>{selectedFolder.name} - Expense OCR Workspace</h2>
            </div>
          </div>
          <div className={styles.workspaceActions}>
            <button className={styles.primaryAction} onClick={handleUploadClick} type="button">
              {uploading ? 'Uploading...' : 'Upload Receipt'}
            </button>
            <button className={styles.secondaryAction} type="button">
              Export
            </button>
          </div>
        </div>

        <div className={styles.workspaceFilters}>
          <label className={styles.workspaceSearch}>
            <span className={styles.searchIcon}>o</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by receipt no, employee, or description..."
              type="search"
              value={searchInput}
            />
          </label>
          <label className={styles.statusField}>
            <span>Status</span>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option>All Statuses</option>
              <option>Ready</option>
              <option>Needs Review</option>
            </select>
          </label>
        </div>

        {uploadError ? <p className={styles.inlineError}>{uploadError}</p> : null}

        <section className={styles.contentsSection}>
          <div className={styles.contentsHeader}>
            <span className={styles.contentsBadge}>Contents</span>
            <span className={styles.contentsMeta}>{selectedContents.length} items found</span>
          </div>

          {selectedContents.length > 0 ? (
            <div className={styles.tableWrap}>
              <div className={styles.tableHeader}>
                <span>Name</span>
                <span>Type</span>
                <span>Size</span>
                <span>Date</span>
                <span>Actions</span>
              </div>
              <div className={styles.tableBody}>
                {selectedContents.map((item) => (
                  <div className={styles.tableRow} key={item.id}>
                    <span className={styles.tableName}>{getDisplayName(item)}</span>
                    <span className={styles.tableCellMuted}>{getItemKind(item)}</span>
                    <span className={styles.tableCellMuted}>
                      {isFolder(item) ? `${item.children?.length ?? 0} items` : formatFileSize(item.size)}
                    </span>
                    <span className={styles.tableCellMuted}>{formatDate(item.modifiedTime)}</span>
                    <div className={styles.tableActions}>
                      {isFolder(item) ? (
                        <button
                          aria-label={getActionLabel(item)}
                          className={styles.iconAction}
                          data-label={getActionLabel(item)}
                          onClick={() => router.push(`/drive/${item.id}`)}
                          type="button"
                        >
                          <span aria-hidden="true">
                            <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M6 3H4.75C3.7835 3 3 3.7835 3 4.75V11.25C3 12.2165 3.7835 13 4.75 13H11.25C12.2165 13 13 12.2165 13 11.25V10"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M8.5 3H13V7.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M12.5 3.5L7.5 8.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              />
                            </svg>
                          </span>
                        </button>
                      ) : (
                        <button
                          aria-label={getActionLabel(item)}
                          className={styles.iconAction}
                          data-label={getActionLabel(item)}
                          onClick={() => openPreview(item)}
                          type="button"
                        >
                          <span aria-hidden="true">
                            <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M1.5 8C2.9 5.2 5.2 3.75 8 3.75C10.8 3.75 13.1 5.2 14.5 8C13.1 10.8 10.8 12.25 8 12.25C5.2 12.25 2.9 10.8 1.5 8Z"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              />
                              <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                          </span>
                        </button>
                      )}
                      <button
                        aria-label={deletingId === item.id ? 'Deleting' : 'Delete'}
                        className={styles.iconDeleteAction}
                        data-label={deletingId === item.id ? 'Deleting' : 'Delete'}
                        disabled={deletingId === item.id}
                        onClick={() => handleDeleteItem(item)}
                        type="button"
                      >
                        <span aria-hidden="true">
                          {deletingId === item.id ? (
                            <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M8 3V5.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M8 10.5V13"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M3 8H5.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M10.5 8H13"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                            </svg>
                          ) : (
                            <svg fill="none" height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M3.5 4.5H12.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M6 2.75H10"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M5 6V11.25C5 11.9404 5.55964 12.5 6.25 12.5H9.75C10.4404 12.5 11 11.9404 11 11.25V6"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M6.75 7.25V10.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M9.25 7.25V10.5"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.5"
                              />
                            </svg>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.emptyWorkspace}>
              <p>No receipts found. Upload your first receipt to get started.</p>
            </div>
          )}
        </section>
      </section>
      </div>

      {previewItem ? (
        <div aria-modal="true" className={styles.modalOverlay} onClick={() => setPreviewItem(null)} role="dialog">
          <section className={styles.modalPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.sectionLabel}>File preview</span>
                <h2>{getDisplayName(previewItem)}</h2>
              </div>
              <button className={styles.modalClose} onClick={() => setPreviewItem(null)} type="button">
                x
              </button>
            </div>
            <div className={styles.modalInfo}>
              <span className={styles.itemBadge}>{getItemKind(previewItem)}</span>
              <span>{formatFileSize(previewItem.size)}</span>
              <span>{formatDate(previewItem.modifiedTime)}</span>
            </div>
            {isImage(previewItem) ? (
              <div className={styles.modalImageWrap}>
                <img
                  alt={getDisplayName(previewItem)}
                  className={styles.modalImage}
                  src={driveService.getFileContentUrl(previewItem.id)}
                />
              </div>
            ) : (
              <iframe
                className={styles.modalFrame}
                referrerPolicy="no-referrer"
                src={previewItem.webViewLink ?? ''}
                title={previewItem.name}
              />
            )}
            <div className={styles.modalActions}>
              <button className={styles.secondaryAction} onClick={() => setPreviewItem(null)} type="button">
                Close
              </button>
              <a className={styles.primaryAction} href={previewItem.webViewLink ?? '#'} rel="noreferrer" target="_blank">
                Open in Drive
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
