// API Service for EMSI File Manager

const API_BASE = import.meta.env.PROD
    ? 'https://emsi-file.me/api'
    : '/api';

export interface FileItem {
    name: string;
    type: 'file' | 'folder';
    path: string;
    extension?: string;
    category?: string;
    size?: number;
    sizeFormatted?: string;
    mime?: string;
    modified: string;
    children?: number;
    files?: number;
}

export interface BrowseResponse {
    success: boolean;
    path: string;
    breadcrumb: { name: string; path: string }[];
    items: FileItem[];
    totalFolders: number;
    totalFiles: number;
}

export interface SearchResponse {
    success: boolean;
    query: string;
    results: FileItem[];
    total: number;
}

export interface FileInfo {
    success: boolean;
    name: string;
    path: string;
    type: string;
    extension?: string;
    category?: string;
    size?: number;
    sizeFormatted?: string;
    mime?: string;
    modified: string;
}

// Browse directory
export async function browseDirectory(path: string = ''): Promise<BrowseResponse> {
    const res = await fetch(`${API_BASE}/?action=browse&path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Download file URL
export function getDownloadUrl(path: string): string {
    return `${API_BASE}/?action=download&path=${encodeURIComponent(path)}`;
}

// Preview file URL
export function getPreviewUrl(path: string): string {
    return `${API_BASE}/?action=preview&path=${encodeURIComponent(path)}`;
}

// Get file info
export async function getFileInfo(path: string): Promise<FileInfo> {
    const res = await fetch(`${API_BASE}/?action=info&path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Search files
export async function searchFiles(query: string, path: string = ''): Promise<SearchResponse> {
    const res = await fetch(`${API_BASE}/?action=search&q=${encodeURIComponent(query)}&path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Download file as blob (for offline storage)
export async function downloadFileBlob(path: string): Promise<{ blob: Blob; filename: string }> {
    const res = await fetch(getDownloadUrl(path));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const filename = path.split('/').pop() || 'file';
    return { blob, filename };
}
