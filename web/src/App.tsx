import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Header from './components/Header';
import FolderBrowser from './components/FolderBrowser';
import FileViewer from './components/FileViewer';
import OfflineManager from './components/OfflineManager';
import { browseDirectory, searchFiles, type FileItem, type BrowseResponse } from './services/api';

type View = 'browser' | 'offline';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

function App() {
  const [currentPath, setCurrentPath] = useState('');
  const [browseData, setBrowseData] = useState<BrowseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileItem[] | null>(null);
  const [viewingFile, setViewingFile] = useState<FileItem | null>(null);
  const [currentView, setCurrentView] = useState<View>('browser');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Toast helper
  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // Load directory
  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    setSearchResults(null);
    setSearchQuery('');
    try {
      const data = await browseDirectory(path);
      setBrowseData(data);
      setCurrentPath(path);
    } catch (err) {
      setError('Impossible de charger le répertoire. Vérifiez que le serveur est démarré.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDirectory('');
  }, [loadDirectory]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query || query.length < 2) {
      setSearchResults(null);
      return;
    }
    try {
      const data = await searchFiles(query, currentPath);
      setSearchResults(data.results);
    } catch (err) {
      console.error('Search error:', err);
    }
  }, [currentPath]);

  // Navigate to path
  const navigateTo = useCallback((path: string) => {
    setViewingFile(null);
    loadDirectory(path);
  }, [loadDirectory]);

  // Open file
  const openFile = useCallback((file: FileItem) => {
    setViewingFile(file);
  }, []);

  // Close file viewer
  const closeViewer = useCallback(() => {
    setViewingFile(null);
  }, []);

  return (
    <div className="app">
      {/* Background effects */}
      <div className="bg-effects">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <Header
        currentPath={currentPath}
        breadcrumb={browseData?.breadcrumb || []}
        onNavigate={navigateTo}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        currentView={currentView}
        onViewChange={setCurrentView}
        isOnline={isOnline}
      />

      <main className="main-content">
        {currentView === 'browser' ? (
          <>
            {viewingFile ? (
              <FileViewer
                file={viewingFile}
                onClose={closeViewer}
                onToast={showToast}
              />
            ) : (
              <FolderBrowser
                data={browseData}
                loading={loading}
                error={error}
                searchResults={searchResults}
                searchQuery={searchQuery}
                onNavigate={navigateTo}
                onOpenFile={openFile}
                onRetry={() => loadDirectory(currentPath)}
                onToast={showToast}
              />
            )}
          </>
        ) : (
          <OfflineManager
            onOpenFile={openFile}
            onToast={showToast}
          />
        )}
      </main>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="offline-banner">
          <span>📡</span> Mode hors ligne — Seuls les fichiers téléchargés sont disponibles
        </div>
      )}
    </div>
  );
}

export default App;
