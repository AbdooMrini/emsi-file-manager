import { useState, useEffect, useCallback } from 'react';
import './OfflineManager.css';
import type { FileItem } from '../services/api';
import { getFileIcon, getCategoryColor, getCategoryLabel, formatDate } from '../services/fileUtils';
import {
    getAllOfflineFiles,
    removeOfflineFile,
    clearOfflineStorage,
    getOfflineStorageSize,
    type OfflineFile,
} from '../services/offlineStorage';

interface OfflineManagerProps {
    onOpenFile: (file: FileItem) => void;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function OfflineManager({ onToast }: OfflineManagerProps) {
    const [files, setFiles] = useState<OfflineFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [storageInfo, setStorageInfo] = useState({ count: 0, totalSize: 0, formatted: '0 B' });

    const loadFiles = useCallback(async () => {
        setLoading(true);
        try {
            const [offlineFiles, info] = await Promise.all([
                getAllOfflineFiles(),
                getOfflineStorageSize(),
            ]);
            setFiles(offlineFiles);
            setStorageInfo(info);
        } catch {
            onToast('Erreur de chargement des fichiers hors ligne', 'error');
        } finally {
            setLoading(false);
        }
    }, [onToast]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const handleRemove = async (path: string, name: string) => {
        try {
            await removeOfflineFile(path);
            onToast(`${name} supprimé du cache`, 'info');
            loadFiles();
        } catch {
            onToast('Erreur de suppression', 'error');
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Supprimer tous les fichiers hors ligne ?')) return;
        try {
            await clearOfflineStorage();
            onToast('Cache vidé', 'success');
            loadFiles();
        } catch {
            onToast('Erreur de vidage du cache', 'error');
        }
    };

    const handleOpenOfflineFile = (file: OfflineFile) => {
        // Create a temporary URL from the blob and open it
        const url = URL.createObjectURL(file.blob);
        window.open(url, '_blank');
        // Clean up after a delay
        setTimeout(() => URL.revokeObjectURL(url), 30000);
    };

    if (loading) {
        return (
            <div className="offline-container">
                <div className="offline-header">
                    <div className="skeleton" style={{ width: 200, height: 24 }} />
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ width: '100%', height: 60, marginBottom: 8 }} />
                ))}
            </div>
        );
    }

    return (
        <div className="offline-container animate-fade-in">
            <div className="offline-header">
                <div>
                    <h2 className="offline-title">💾 Fichiers hors ligne</h2>
                    <p className="offline-subtitle">
                        {storageInfo.count} fichier{storageInfo.count !== 1 ? 's' : ''} • {storageInfo.formatted}
                    </p>
                </div>
                {files.length > 0 && (
                    <button className="clear-all-btn" onClick={handleClearAll}>
                        🗑️ Tout supprimer
                    </button>
                )}
            </div>

            {files.length === 0 ? (
                <div className="offline-empty">
                    <div className="offline-empty-icon">📱</div>
                    <h3>Aucun fichier sauvegardé</h3>
                    <p>
                        Sauvegardez des fichiers pour y accéder même sans connexion internet.
                        Utilisez le bouton 💾 sur n'importe quel fichier.
                    </p>
                </div>
            ) : (
                <div className="offline-files">
                    {files.map((file, index) => (
                        <div
                            key={file.path}
                            className="offline-file-card"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div
                                className="offline-file-main"
                                onClick={() => handleOpenOfflineFile(file)}
                            >
                                <span
                                    className="offline-file-icon"
                                    style={{ filter: `drop-shadow(0 0 6px ${getCategoryColor(file.category)})` }}
                                >
                                    {getFileIcon(file.extension)}
                                </span>
                                <div className="offline-file-info">
                                    <span className="offline-file-name">{file.name}</span>
                                    <div className="offline-file-meta">
                                        <span
                                            className="offline-file-badge"
                                            style={{
                                                background: `${getCategoryColor(file.category)}22`,
                                                color: getCategoryColor(file.category),
                                            }}
                                        >
                                            {getCategoryLabel(file.category)}
                                        </span>
                                        <span>{file.sizeFormatted}</span>
                                        <span>Sauvé {formatDate(file.savedAt)}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                className="offline-remove-btn"
                                onClick={() => handleRemove(file.path, file.name)}
                                title="Supprimer"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
