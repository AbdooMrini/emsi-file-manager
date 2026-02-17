import { useState, useRef, useEffect } from 'react';
import './Header.css';

interface HeaderProps {
    currentPath: string;
    breadcrumb: { name: string; path: string }[];
    onNavigate: (path: string) => void;
    onSearch: (query: string) => void;
    searchQuery: string;
    currentView: 'browser' | 'offline';
    onViewChange: (view: 'browser' | 'offline') => void;
    isOnline: boolean;
}

export default function Header({
    breadcrumb,
    onNavigate,
    onSearch,
    searchQuery,
    currentView,
    onViewChange,
    isOnline,
}: HeaderProps) {
    const [searchFocused, setSearchFocused] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSearchChange = (value: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            onSearch(value);
        }, 300);
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return (
        <header className="header glass">
            <div className="header-left">
                <button className="logo-btn" onClick={() => onNavigate('')}>
                    <div className="logo-icon">
                        <span>📚</span>
                    </div>
                    <div className="logo-text">
                        <span className="logo-title">EMSI</span>
                        <span className="logo-subtitle">File Manager</span>
                    </div>
                </button>

                {/* Breadcrumb */}
                <nav className="breadcrumb" aria-label="Navigation">
                    <button
                        className="breadcrumb-item breadcrumb-root"
                        onClick={() => onNavigate('')}
                    >
                        🏠
                    </button>
                    {breadcrumb.map((item, i) => (
                        <span key={item.path} className="breadcrumb-segment">
                            <span className="breadcrumb-sep">›</span>
                            <button
                                className={`breadcrumb-item ${i === breadcrumb.length - 1 ? 'active' : ''}`}
                                onClick={() => onNavigate(item.path)}
                            >
                                {item.name}
                            </button>
                        </span>
                    ))}
                </nav>
            </div>

            <div className="header-center">
                <div className={`search-box ${searchFocused ? 'focused' : ''}`}>
                    <span className="search-icon">🔍</span>
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Rechercher des fichiers..."
                        defaultValue={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button
                            className="search-clear"
                            onClick={() => {
                                if (searchRef.current) searchRef.current.value = '';
                                onSearch('');
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            <div className="header-right">
                {/* View toggle */}
                <div className="view-tabs">
                    <button
                        className={`view-tab ${currentView === 'browser' ? 'active' : ''}`}
                        onClick={() => onViewChange('browser')}
                    >
                        <span>📂</span>
                        <span className="tab-label">Fichiers</span>
                    </button>
                    <button
                        className={`view-tab ${currentView === 'offline' ? 'active' : ''}`}
                        onClick={() => onViewChange('offline')}
                    >
                        <span>💾</span>
                        <span className="tab-label">Hors ligne</span>
                    </button>
                </div>

                {/* Status */}
                <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
                    <span className="status-dot" />
                    <span className="status-text">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
                </div>
            </div>
        </header>
    );
}
