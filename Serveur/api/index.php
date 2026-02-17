<?php
/**
 * EMSI File Manager - Backend API
 * Endpoints:
 *   ?action=browse&path=        - List directory contents
 *   ?action=download&path=      - Download a file
 *   ?action=info&path=          - Get file metadata
 *   ?action=search&q=&path=     - Search files by name
 */

header('Content-Type: application/json; charset=utf-8');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = ['https://emsi-file.me', 'http://localhost:5173', 'http://localhost', 'https://localhost', 'capacitor://localhost'];
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: https://emsi-file.me');
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Root directory for files
define('ROOT_DIR', realpath(__DIR__ . '/../EMSI'));

if (!ROOT_DIR || !is_dir(ROOT_DIR)) {
    http_response_code(500);
    echo json_encode(['error' => 'Root directory not found', 'path' => __DIR__ . '/../EMSI']);
    exit;
}

// Allowed file extensions
$ALLOWED_EXTENSIONS = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'txt',
    'rtf',
    'odt',
    'ods',
    'odp',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'svg',
    'webp',
    'ico',
    'zip',
    'rar',
    '7z',
    'csv',
    'json',
    'xml'
];

// File type categories
function getFileCategory($ext)
{
    $ext = strtolower($ext);
    $categories = [
        'pdf' => ['pdf'],
        'word' => ['doc', 'docx', 'odt', 'rtf'],
        'excel' => ['xls', 'xlsx', 'ods', 'csv'],
        'powerpoint' => ['ppt', 'pptx', 'odp'],
        'image' => ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'],
        'text' => ['txt', 'json', 'xml'],
        'archive' => ['zip', 'rar', '7z']
    ];
    foreach ($categories as $cat => $exts) {
        if (in_array($ext, $exts))
            return $cat;
    }
    return 'other';
}

// MIME type mapping
function getMimeType($ext)
{
    $mimes = [
        'pdf' => 'application/pdf',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls' => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt' => 'application/vnd.ms-powerpoint',
        'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt' => 'text/plain',
        'csv' => 'text/csv',
        'json' => 'application/json',
        'xml' => 'application/xml',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'bmp' => 'image/bmp',
        'svg' => 'image/svg+xml',
        'webp' => 'image/webp',
        'zip' => 'application/zip',
        'rar' => 'application/x-rar-compressed',
        '7z' => 'application/x-7z-compressed',
    ];
    return $mimes[strtolower($ext)] ?? 'application/octet-stream';
}

// Security: validate path to prevent directory traversal
function getSecurePath($requestedPath)
{
    if (empty($requestedPath) || $requestedPath === '/' || $requestedPath === '.') {
        return ROOT_DIR;
    }

    // Remove leading/trailing slashes
    $requestedPath = trim($requestedPath, '/\\');

    // Block traversal attempts
    if (strpos($requestedPath, '..') !== false) {
        return false;
    }

    $fullPath = ROOT_DIR . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $requestedPath);
    $realPath = realpath($fullPath);

    if ($realPath === false) {
        return false;
    }

    // Must be within ROOT_DIR
    if (strpos($realPath, ROOT_DIR) !== 0) {
        return false;
    }

    return $realPath;
}

// Format file size
function formatSize($bytes)
{
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;
    while ($bytes >= 1024 && $i < count($units) - 1) {
        $bytes /= 1024;
        $i++;
    }
    return round($bytes, 2) . ' ' . $units[$i];
}

// Get relative path from ROOT_DIR
function getRelativePath($fullPath)
{
    $rel = str_replace(ROOT_DIR, '', $fullPath);
    $rel = str_replace('\\', '/', $rel);
    return ltrim($rel, '/');
}

// --- ACTIONS ---

function actionBrowse($path)
{
    global $ALLOWED_EXTENSIONS;

    $dirPath = getSecurePath($path);
    if ($dirPath === false || !is_dir($dirPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'Directory not found']);
        return;
    }

    $items = [];
    $entries = scandir($dirPath);

    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..')
            continue;

        $fullPath = $dirPath . DIRECTORY_SEPARATOR . $entry;
        $isDir = is_dir($fullPath);

        if ($isDir) {
            // Count children
            $childCount = 0;
            $childFiles = 0;
            if ($dh = opendir($fullPath)) {
                while (($child = readdir($dh)) !== false) {
                    if ($child === '.' || $child === '..')
                        continue;
                    $childCount++;
                    if (is_file($fullPath . DIRECTORY_SEPARATOR . $child)) {
                        $childFiles++;
                    }
                }
                closedir($dh);
            }

            $items[] = [
                'name' => $entry,
                'type' => 'folder',
                'path' => getRelativePath($fullPath),
                'children' => $childCount,
                'files' => $childFiles,
                'modified' => date('Y-m-d H:i:s', filemtime($fullPath))
            ];
        } else {
            $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
            if (!in_array($ext, $ALLOWED_EXTENSIONS))
                continue;

            $size = filesize($fullPath);
            $items[] = [
                'name' => $entry,
                'type' => 'file',
                'path' => getRelativePath($fullPath),
                'extension' => $ext,
                'category' => getFileCategory($ext),
                'size' => $size,
                'sizeFormatted' => formatSize($size),
                'mime' => getMimeType($ext),
                'modified' => date('Y-m-d H:i:s', filemtime($fullPath))
            ];
        }
    }

    // Sort: folders first, then files, alphabetically
    usort($items, function ($a, $b) {
        if ($a['type'] !== $b['type']) {
            return $a['type'] === 'folder' ? -1 : 1;
        }
        return strcasecmp($a['name'], $b['name']);
    });

    $currentPath = getRelativePath($dirPath);
    $breadcrumb = [];
    if (!empty($currentPath)) {
        $parts = explode('/', $currentPath);
        $cumulative = '';
        foreach ($parts as $part) {
            $cumulative .= ($cumulative ? '/' : '') . $part;
            $breadcrumb[] = ['name' => $part, 'path' => $cumulative];
        }
    }

    echo json_encode([
        'success' => true,
        'path' => $currentPath,
        'breadcrumb' => $breadcrumb,
        'items' => $items,
        'totalFolders' => count(array_filter($items, fn($i) => $i['type'] === 'folder')),
        'totalFiles' => count(array_filter($items, fn($i) => $i['type'] === 'file'))
    ], JSON_UNESCAPED_UNICODE);
}

function actionDownload($path)
{
    $filePath = getSecurePath($path);
    if ($filePath === false || !is_file($filePath)) {
        http_response_code(404);
        echo json_encode(['error' => 'File not found']);
        return;
    }

    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mime = getMimeType($ext);
    $filename = basename($filePath);

    header('Content-Type: ' . $mime);
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: no-cache');

    readfile($filePath);
    exit;
}

function actionPreview($path)
{
    $filePath = getSecurePath($path);
    if ($filePath === false || !is_file($filePath)) {
        http_response_code(404);
        echo json_encode(['error' => 'File not found']);
        return;
    }

    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $mime = getMimeType($ext);

    header('Content-Type: ' . $mime);
    header('Content-Disposition: inline; filename="' . basename($filePath) . '"');
    header('Content-Length: ' . filesize($filePath));
    header('Cache-Control: public, max-age=3600');

    readfile($filePath);
    exit;
}

function actionInfo($path)
{
    $filePath = getSecurePath($path);
    if ($filePath === false) {
        http_response_code(404);
        echo json_encode(['error' => 'Path not found']);
        return;
    }

    $name = basename($filePath);
    $isDir = is_dir($filePath);

    $info = [
        'success' => true,
        'name' => $name,
        'path' => getRelativePath($filePath),
        'type' => $isDir ? 'folder' : 'file',
        'modified' => date('Y-m-d H:i:s', filemtime($filePath))
    ];

    if (!$isDir) {
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        $info['extension'] = $ext;
        $info['category'] = getFileCategory($ext);
        $info['size'] = filesize($filePath);
        $info['sizeFormatted'] = formatSize(filesize($filePath));
        $info['mime'] = getMimeType($ext);
    }

    echo json_encode($info, JSON_UNESCAPED_UNICODE);
}

function actionSearch($query, $path)
{
    global $ALLOWED_EXTENSIONS;

    $dirPath = getSecurePath($path);
    if ($dirPath === false || !is_dir($dirPath)) {
        $dirPath = ROOT_DIR;
    }

    $query = strtolower(trim($query));
    if (empty($query) || strlen($query) < 2) {
        http_response_code(400);
        echo json_encode(['error' => 'Search query must be at least 2 characters']);
        return;
    }

    $results = [];
    $maxResults = 50;

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dirPath, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $item) {
        if (count($results) >= $maxResults)
            break;

        $name = $item->getFilename();
        if (strpos(strtolower($name), $query) === false)
            continue;

        $fullPath = $item->getPathname();

        if ($item->isDir()) {
            $results[] = [
                'name' => $name,
                'type' => 'folder',
                'path' => getRelativePath($fullPath),
                'modified' => date('Y-m-d H:i:s', $item->getMTime())
            ];
        } else {
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (!in_array($ext, $ALLOWED_EXTENSIONS))
                continue;

            $results[] = [
                'name' => $name,
                'type' => 'file',
                'path' => getRelativePath($fullPath),
                'extension' => $ext,
                'category' => getFileCategory($ext),
                'size' => $item->getSize(),
                'sizeFormatted' => formatSize($item->getSize()),
                'modified' => date('Y-m-d H:i:s', $item->getMTime())
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'query' => $query,
        'results' => $results,
        'total' => count($results)
    ], JSON_UNESCAPED_UNICODE);
}

// --- ROUTER ---

$action = $_GET['action'] ?? 'browse';
$path = $_GET['path'] ?? '';
$query = $_GET['q'] ?? '';

switch ($action) {
    case 'browse':
        actionBrowse($path);
        break;
    case 'download':
        actionDownload($path);
        break;
    case 'preview':
        actionPreview($path);
        break;
    case 'info':
        actionInfo($path);
        break;
    case 'search':
        actionSearch($query, $path);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action. Available: browse, download, preview, info, search']);
}
