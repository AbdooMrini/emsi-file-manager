// File utility functions

// File type icons
export function getFileIcon(extension: string, isFolder: boolean = false): string {
    if (isFolder) return '📁';

    const icons: Record<string, string> = {
        pdf: '📕',
        doc: '📘', docx: '📘', odt: '📘', rtf: '📘',
        xls: '📗', xlsx: '📗', ods: '📗', csv: '📗',
        ppt: '📙', pptx: '📙', odp: '📙',
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', bmp: '🖼️', svg: '🖼️', webp: '🖼️',
        txt: '📄', json: '📄', xml: '📄',
        zip: '📦', rar: '📦', '7z': '📦',
    };

    return icons[extension?.toLowerCase()] || '📎';
}

// File category colors
export function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        pdf: '#ef4444',
        word: '#3b82f6',
        excel: '#10b981',
        powerpoint: '#f59e0b',
        image: '#8b5cf6',
        text: '#64748b',
        archive: '#06b6d4',
    };
    return colors[category] || '#64748b';
}

// Category labels
export function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        pdf: 'PDF',
        word: 'Word',
        excel: 'Excel',
        powerpoint: 'PowerPoint',
        image: 'Image',
        text: 'Texte',
        archive: 'Archive',
    };
    return labels[category] || 'Fichier';
}

// Check if file can be previewed inline
export function canPreview(extension: string): boolean {
    const previewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'txt', 'json', 'xml', 'csv'];
    return previewable.includes(extension?.toLowerCase());
}

// Check if file is an image
export function isImage(extension: string): boolean {
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension?.toLowerCase());
}

// Check if file is a text file
export function isTextFile(extension: string): boolean {
    return ['txt', 'json', 'xml', 'csv'].includes(extension?.toLowerCase());
}

// Format date
export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;

    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Get parent path
export function getParentPath(path: string): string {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
}
