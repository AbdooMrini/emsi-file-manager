// Offline Storage Service using IndexedDB

const DB_NAME = 'emsi_file_manager';
const DB_VERSION = 1;
const STORE_FILES = 'offline_files';
const STORE_META = 'offline_meta';

export interface OfflineFile {
    path: string;
    name: string;
    extension: string;
    category: string;
    size: number;
    sizeFormatted: string;
    blob: Blob;
    savedAt: string;
    parentPath: string;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_FILES)) {
                db.createObjectStore(STORE_FILES, { keyPath: 'path' });
            }
            if (!db.objectStoreNames.contains(STORE_META)) {
                db.createObjectStore(STORE_META, { keyPath: 'key' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// Save file for offline access
export async function saveFileOffline(file: OfflineFile): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        tx.objectStore(STORE_FILES).put(file);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Get a single offline file
export async function getOfflineFile(path: string): Promise<OfflineFile | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const req = tx.objectStore(STORE_FILES).get(path);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// Get all offline files
export async function getAllOfflineFiles(): Promise<OfflineFile[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readonly');
        const req = tx.objectStore(STORE_FILES).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// Remove offline file
export async function removeOfflineFile(path: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        tx.objectStore(STORE_FILES).delete(path);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Check if file is saved offline
export async function isFileOffline(path: string): Promise<boolean> {
    const file = await getOfflineFile(path);
    return !!file;
}

// Get total offline storage size
export async function getOfflineStorageSize(): Promise<{ count: number; totalSize: number; formatted: string }> {
    const files = await getAllOfflineFiles();
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    return {
        count: files.length,
        totalSize,
        formatted: formatBytes(totalSize)
    };
}

// Clear all offline files
export async function clearOfflineStorage(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_FILES, 'readwrite');
        tx.objectStore(STORE_FILES).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
}
