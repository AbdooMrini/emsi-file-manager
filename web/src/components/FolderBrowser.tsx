import { useState } from 'react';
import './FolderBrowser.css';
import type { FileItem, BrowseResponse } from '../services/api';
import { downloadFileBlob, getDownloadUrl } from '../services/api';
import { getFileIcon, getCategoryColor, getCategoryLabel, formatDate } from '../services/fileUtils';
import { saveFileOffline, type OfflineFile } from '../services/offlineStorage';

interface FolderBrowserProps {
    data: BrowseResponse | null;
    loading: boolean;
    error: string | null;
    searchResults: FileItem[] | null;
    searchQuery: string;
    onNavigate: (path: string) => void;
    onOpenFile: (file: FileItem) => void;
    onRetry: () => void;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type ViewMode = 'grid' | 'list';

export default function FolderBrowser({
    data,
    loading,
    error,
    searchResults,
    searchQuery,
    onNavigate,
    onOpenFile,
    onRetry,
    onToast,
}: FolderBrowserProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [savingPaths, setSavingPaths] = useState<Set<string>>(new Set());

    const items = searchResults || data?.items || [];

    // Download file
    const handleDownload = (e: React.MouseEvent, file: FileItem) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = getDownloadUrl(file.path);
        link.download = file.name;
        link.click();
        onToast(`Téléchargement de ${file.name}`, 'info');
    };

    // Save for offline
    const handleSaveOffline = async (e: React.MouseEvent, file: FileItem) => {
        e.stopPropagation();
        if (savingPaths.has(file.path)) return;

        setSavingPaths(p => new Set(p).add(file.path));
        try {
            const { blob } = await downloadFileBlob(file.path);
            const offlineFile: OfflineFile = {
                path: file.path,
                name: file.name,
                extension: file.extension || '',
                category: file.category || 'other',
                size: file.size || 0,
                sizeFormatted: file.sizeFormatted || '',
                blob,
                savedAt: new Date().toISOString(),
                parentPath: file.path.split('/').slice(0, -1).join('/'),
            };
            await saveFileOffline(offlineFile);
            onToast(`${file.name} sauvegardé hors ligne ✓`, 'success');
        } catch {
            onToast(`Erreur lors de la sauvegarde de ${file.name}`, 'error');
        } finally {
            setSavingPaths(p => {
                const n = new Set(p);
                n.delete(file.path);
                return n;
            });
        }
    };

    // Share file
    const handleShare = async (e: React.MouseEvent, file: FileItem) => {
        e.stopPropagation();
        const url = window.location.origin + getDownloadUrl(file.path);
        if (navigator.share) {
            try {
                await navigator.share({
                    title: file.name,
                    text: `Fichier: ${file.name}`,
                    url,
                });
            } catch {
                // User cancelled
            }
        } else {
            await navigator.clipboard.writeText(url);
            onToast('Lien copié dans le presse-papiers', 'success');
        }
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="browser-container">
                <div className="browser-header">
                    <div className="skeleton" style={{ width: 200, height: 24 }} />
                    <div className="skeleton" style={{ width: 80, height: 32 }} />
                </div>
                <div className={`items-${viewMode}`}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`item-card skeleton-card ${viewMode}`}>
                            <div className="skeleton" style={{ width: 48, height: 48 }} />
                            <div className="skeleton" style={{ width: '70%', height: 16, marginTop: 8 }} />
                            <div className="skeleton" style={{ width: '40%', height: 12, marginTop: 4 }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="browser-container">
                <div className="error-state animate-fade-in">
                    <div className="error-icon">⚠️</div>
                    <h3>Erreur de connexion</h3>
                    <p>{error}</p>
                    <button className="retry-btn" onClick={onRetry}>
                        🔄 Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="browser-container animate-fade-in">
            {/* Header */}
            <div className="browser-header">
                <div className="browser-info">
                    {searchQuery ? (
                        <h2 className="browser-title">
                            🔍 Résultats pour "<span className="highlight">{searchQuery}</span>"
                            <span className="count-badge">{items.length}</span>
                        </h2>
                    ) : (
                        <h2 className="browser-title">
                            {data?.breadcrumb?.length
                                ? data.breadcrumb[data.breadcrumb.length - 1].name
                                : 'EMSI - Documents'}
                            <span className="count-badge">
                                {data?.totalFolders ? `${data.totalFolders} 📁` : ''}
                                {data?.totalFiles ? ` ${data.totalFiles} 📄` : ''}
                            </span>
                        </h2>
                    )}
                </div>
                <div className="view-controls">
                    <button
                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Vue grille"
                    >
                        ▦
                    </button>
                    <button
                        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="Vue liste"
                    >
                        ☰
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {items.length === 0 && (
                <div className="empty-state animate-fade-in">
                    <div className="empty-icon">📭</div>
                    <h3>Aucun fichier trouvé</h3>
                    <p>{searchQuery ? 'Aucun résultat pour cette recherche.' : 'Ce dossier est vide.'}</p>
                </div>
            )}

            {/* Items */}
            <div className={`items-${viewMode}`}>
                {items.map((item, index) => (
                    <div
                        key={item.path}
                        className={`item-card ${viewMode} ${item.type}`}
                        style={{ animationDelay: `${index * 0.04}s` }}
                        onClick={() => item.type === 'folder' ? onNavigate(item.path) : onOpenFile(item)}
                    >
                        {/* Icon */}
                        <div className="item-icon-wrap">
                            <span
                                className="item-icon"
                                style={item.type === 'file' ? { filter: `drop-shadow(0 0 8px ${getCategoryColor(item.category || '')})` } : undefined}
                            >
                                {getFileIcon(item.extension || '', item.type === 'folder')}
                            </span>
                            {item.type === 'folder' && item.children !== undefined && (
                                <span className="folder-count">{item.children}</span>
                            )}
                        </div>

                        {/* Info */}
                        <div className="item-info">
                            <span className="item-name" title={item.name}>{item.name}</span>
                            <div className="item-meta">
                                {item.type === 'file' && (
                                    <>
                                        <span
                                            className="item-badge"
                                            style={{ background: `${getCategoryColor(item.category || '')}22`, color: getCategoryColor(item.category || '') }}
                                        >
                                            {getCategoryLabel(item.category || '')}
                                        </span>
                                        <span className="item-size">{item.sizeFormatted}</span>
                                    </>
                                )}
                                <span className="item-date">{formatDate(item.modified)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        {item.type === 'file' && (
                            <div className="item-actions">
                                <button
                                    className="action-btn"
                                    onClick={(e) => handleDownload(e, item)}
                                    title="Télécharger"
                                >
                                    ⬇️
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={(e) => handleSaveOffline(e, item)}
                                    title="Sauvegarder hors ligne"
                                    disabled={savingPaths.has(item.path)}
                                >
                                    {savingPaths.has(item.path) ? '⏳' : '💾'}
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={(e) => handleShare(e, item)}
                                    title="Partager"
                                >
                                    📤
                                </button>
                            </div>
                        )}

                        {item.type === 'folder' && (
                            <div className="item-arrow">›</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
