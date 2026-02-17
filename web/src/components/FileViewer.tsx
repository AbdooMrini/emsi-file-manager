import { useState, useEffect } from 'react';
import './FileViewer.css';
import type { FileItem } from '../services/api';
import { getPreviewUrl, getDownloadUrl, downloadFileBlob } from '../services/api';
import { getFileIcon, getCategoryColor, getCategoryLabel, isImage, isTextFile, formatDate } from '../services/fileUtils';
import { saveFileOffline, type OfflineFile } from '../services/offlineStorage';

interface FileViewerProps {
    file: FileItem;
    onClose: () => void;
    onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function FileViewer({ file, onClose, onToast }: FileViewerProps) {
    const [textContent, setTextContent] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const ext = file.extension || '';
    const previewUrl = getPreviewUrl(file.path);

    // Load text content for text files
    useEffect(() => {
        if (isTextFile(ext)) {
            fetch(previewUrl)
                .then(res => res.text())
                .then(text => setTextContent(text))
                .catch(() => setTextContent('Impossible de charger le fichier.'));
        }
    }, [ext, previewUrl]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = getDownloadUrl(file.path);
        link.download = file.name;
        link.click();
        onToast(`Téléchargement de ${file.name}`, 'info');
    };

    const handleSaveOffline = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const { blob } = await downloadFileBlob(file.path);
            const offlineFile: OfflineFile = {
                path: file.path,
                name: file.name,
                extension: ext,
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
            onToast('Erreur lors de la sauvegarde', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.origin + getDownloadUrl(file.path);
        if (navigator.share) {
            try {
                await navigator.share({ title: file.name, url });
            } catch { /* cancelled */ }
        } else {
            await navigator.clipboard.writeText(url);
            onToast('Lien copié !', 'success');
        }
    };

    return (
        <div className="viewer-container animate-fade-in">
            {/* Top bar */}
            <div className="viewer-header glass">
                <button className="viewer-back" onClick={onClose}>
                    ← Retour
                </button>
                <div className="viewer-file-info">
                    <span className="viewer-icon">{getFileIcon(ext)}</span>
                    <div className="viewer-details">
                        <span className="viewer-name">{file.name}</span>
                        <div className="viewer-meta">
                            <span
                                className="viewer-badge"
                                style={{ background: `${getCategoryColor(file.category || '')}22`, color: getCategoryColor(file.category || '') }}
                            >
                                {getCategoryLabel(file.category || '')}
                            </span>
                            <span>{file.sizeFormatted}</span>
                            <span>{formatDate(file.modified)}</span>
                        </div>
                    </div>
                </div>
                <div className="viewer-actions">
                    <button className="viewer-action-btn" onClick={handleDownload} title="Télécharger">
                        ⬇️ <span className="action-label">Télécharger</span>
                    </button>
                    <button className="viewer-action-btn" onClick={handleSaveOffline} disabled={saving} title="Hors ligne">
                        {saving ? '⏳' : '💾'} <span className="action-label">Hors ligne</span>
                    </button>
                    <button className="viewer-action-btn" onClick={handleShare} title="Partager">
                        📤 <span className="action-label">Partager</span>
                    </button>
                </div>
            </div>

            {/* Preview content */}
            <div className="viewer-content">
                {ext === 'pdf' && (
                    <iframe
                        src={previewUrl}
                        className="viewer-iframe"
                        title={file.name}
                    />
                )}

                {isImage(ext) && (
                    <div className="viewer-image-wrap">
                        <img
                            src={previewUrl}
                            alt={file.name}
                            className="viewer-image"
                        />
                    </div>
                )}

                {isTextFile(ext) && (
                    <div className="viewer-text-wrap">
                        <pre className="viewer-text">{textContent || 'Chargement...'}</pre>
                    </div>
                )}

                {!['pdf'].includes(ext) && !isImage(ext) && !isTextFile(ext) && (
                    <div className="viewer-no-preview">
                        <div className="no-preview-icon">{getFileIcon(ext)}</div>
                        <h3>Aperçu non disponible</h3>
                        <p>Ce type de fichier ne peut pas être prévisualisé dans le navigateur.</p>
                        <button className="download-cta" onClick={handleDownload}>
                            ⬇️ Télécharger le fichier
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
