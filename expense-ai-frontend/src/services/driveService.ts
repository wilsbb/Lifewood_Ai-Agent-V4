// src/services/driveService.ts
import { getApiBaseUrl } from '../lib/api';

const apiUrl = (path: string) => `${getApiBaseUrl()}${path}`;

export const driveService = {
  // 1. Get the Auth URL from Django
  getAuthUrl: async () => {
    // We point directly to the Django endpoint we created
    return apiUrl('/api/google/auth/');
  },

  // 2. Fetch the list of files from Django
  listFiles: async () => {
    const response = await fetch(apiUrl('/api/google/files/'), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    if (!response.ok) throw new Error("Failed to fetch files");
    return response.json();
  },

  getFileContentUrl: (fileId: string) => apiUrl(`/api/google/files/${fileId}/content/`),

  uploadFileToFolder: async (folderId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(apiUrl(`/api/google/folders/${folderId}/upload/`), {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to upload file');
    }

    const text = await response.text();

    if (!text.trim()) {
      return {
        id: `temp-${Date.now()}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: String(file.size),
        modifiedTime: new Date().toISOString(),
        webViewLink: '',
      };
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        id: `temp-${Date.now()}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: String(file.size),
        modifiedTime: new Date().toISOString(),
        webViewLink: '',
      };
    }
  },

  deleteFile: async (fileId: string) => {
    const response = await fetch(apiUrl(`/api/google/files/${fileId}/delete/`), {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to delete file');
    }

    return response.json();
  },
};
