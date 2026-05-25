'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  File,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  FileCode,
  FileText,
  FileJson,
  Trash2,
  Edit2,
  Loader2,
  Copy,
  Move,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface FileItem {
  path: string;
  content: string;
  language: string;
  size: number;
}

interface FileExplorerProps {
  files: FileItem[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  projectId: string;
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
  projectId,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['src'])
  );
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [renameFilePath, setRenameFilePath] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [destinationPath, setDestinationPath] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const queryClient = useQueryClient();

  // Build file tree structure
  const fileTree = buildFileTree(files);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleFileSelection = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const handleDeleteFiles = async () => {
    if (selectedFiles.size === 0) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths: Array.from(selectedFiles) }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete files');
      }

      // Refresh project data
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      // Clear selection
      setSelectedFiles(new Set());
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('Error deleting files:', error);
      alert(`Failed to delete files: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameFile = async () => {
    if (!renameFilePath || !newFileName) return;

    setIsRenaming(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'rename',
          oldPath: renameFilePath,
          newPath: newFileName,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to rename file');
      }

      // Refresh project data
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      // Clear rename state
      setRenameFilePath('');
      setNewFileName('');
      setShowRenameDialog(false);
    } catch (error: any) {
      console.error('Error renaming file:', error);
      alert(`Failed to rename file: ${error.message}`);
    } finally {
      setIsRenaming(false);
    }
  };

  const openRenameDialog = (path: string) => {
    setRenameFilePath(path);
    setNewFileName(path);
    setShowRenameDialog(true);
  };

  const handleCopyFiles = async () => {
    if (selectedFiles.size === 0 || !destinationPath) return;

    setIsCopying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'copy',
          filePaths: Array.from(selectedFiles),
          newPath: destinationPath,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to copy files');
      }

      // Refresh project data
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      // Clear state
      setSelectedFiles(new Set());
      setDestinationPath('');
      setShowCopyDialog(false);
    } catch (error: any) {
      console.error('Error copying files:', error);
      alert(`Failed to copy files: ${error.message}`);
    } finally {
      setIsCopying(false);
    }
  };

  const handleMoveFiles = async () => {
    if (selectedFiles.size === 0 || !destinationPath) return;

    setIsMoving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'move',
          filePaths: Array.from(selectedFiles),
          newPath: destinationPath,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to move files');
      }

      // Refresh project data
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });

      // Clear state
      setSelectedFiles(new Set());
      setDestinationPath('');
      setShowMoveDialog(false);
    } catch (error: any) {
      console.error('Error moving files:', error);
      alert(`Failed to move files: ${error.message}`);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      {selectedFiles.size > 0 && (
        <div className="border-b p-2 flex items-center gap-2 bg-muted">
          <span className="text-xs font-medium text-muted-foreground">
            {selectedFiles.size} selected
          </span>
          <div className="flex-1" />
          {selectedFiles.size === 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1"
              onClick={() => openRenameDialog(Array.from(selectedFiles)[0])}
            >
              <Edit2 className="h-3 w-3" />
              <span className="text-xs">Rename</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1"
            onClick={() => {
              setDestinationPath('src');
              setShowCopyDialog(true);
            }}
          >
            <Copy className="h-3 w-3" />
            <span className="text-xs">Copy</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1"
            onClick={() => {
              setDestinationPath('src');
              setShowMoveDialog(true);
            }}
          >
            <Move className="h-3 w-3" />
            <span className="text-xs">Move</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-3 w-3" />
            <span className="text-xs">Delete</span>
          </Button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {Object.keys(fileTree).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mb-4">
              <Folder className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No files yet</p>
            <p className="text-xs text-muted-foreground mb-4">Start by generating code with AI</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Generate Code
            </Button>
          </div>
        ) : (
          <FileTreeNode
            name=""
            node={fileTree}
            path=""
            level={0}
            expandedFolders={expandedFolders}
            selectedFile={selectedFile}
            selectedFiles={selectedFiles}
            onSelectFile={onSelectFile}
            onToggleFolder={toggleFolder}
            onToggleFileSelection={toggleFileSelection}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedFiles.size} file(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The following files will be permanently
              deleted:
              <ul className="mt-2 text-xs font-mono space-y-1">
                {Array.from(selectedFiles).map((path) => (
                  <li key={path}>• {path}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFiles}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name/path for the file
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-path">New file path</Label>
              <Input
                id="new-path"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="src/components/MyComponent.tsx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameFile} disabled={isRenaming}>
              {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy {selectedFiles.size} file(s)</DialogTitle>
            <DialogDescription>
              Select the destination folder path
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="copy-dest">Destination folder</Label>
              <Input
                id="copy-dest"
                value={destinationPath}
                onChange={(e) => setDestinationPath(e.target.value)}
                placeholder="src/components"
              />
              <p className="text-xs text-muted-foreground">
                Files will be copied to: {destinationPath}/[filename]
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 border">
              <p className="text-xs font-semibold mb-2">Files to copy:</p>
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {Array.from(selectedFiles).map((path) => (
                  <li key={path} className="font-mono">• {path}</li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCopyDialog(false)}
              disabled={isCopying}
            >
              Cancel
            </Button>
            <Button onClick={handleCopyFiles} disabled={isCopying || !destinationPath}>
              {isCopying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {selectedFiles.size} file(s)</DialogTitle>
            <DialogDescription>
              Select the destination folder path
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="move-dest">Destination folder</Label>
              <Input
                id="move-dest"
                value={destinationPath}
                onChange={(e) => setDestinationPath(e.target.value)}
                placeholder="src/components"
              />
              <p className="text-xs text-muted-foreground">
                Files will be moved to: {destinationPath}/[filename]
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 border">
              <p className="text-xs font-semibold mb-2">Files to move:</p>
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {Array.from(selectedFiles).map((path) => (
                  <li key={path} className="font-mono">• {path}</li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMoveDialog(false)}
              disabled={isMoving}
            >
              Cancel
            </Button>
            <Button onClick={handleMoveFiles} disabled={isMoving || !destinationPath}>
              {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TreeNode {
  type: 'file' | 'folder';
  children?: { [key: string]: TreeNode };
  data?: FileItem;
}

function buildFileTree(files: FileItem[]): { [key: string]: TreeNode } {
  const tree: { [key: string]: TreeNode } = {};

  files.forEach((file) => {
    const parts = file.path.split('/').filter(Boolean);
    let current = tree;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;

      if (!current[part]) {
        current[part] = {
          type: isLast ? 'file' : 'folder',
          children: isLast ? undefined : {},
          data: isLast ? file : undefined,
        };
      }

      if (!isLast && current[part].children) {
        current = current[part].children!;
      }
    });
  });

  return tree;
}

function FileTreeNode({
  name,
  node,
  path,
  level,
  expandedFolders,
  selectedFile,
  selectedFiles,
  onSelectFile,
  onToggleFolder,
  onToggleFileSelection,
}: {
  name: string;
  node: { [key: string]: TreeNode };
  path: string;
  level: number;
  expandedFolders: Set<string>;
  selectedFile: string | null;
  selectedFiles: Set<string>;
  onSelectFile: (path: string) => void;
  onToggleFolder: (path: string) => void;
  onToggleFileSelection: (path: string) => void;
}) {
  return (
    <>
      {Object.entries(node).map(([key, value]) => {
        const currentPath = path ? `${path}/${key}` : key;
        const isExpanded = expandedFolders.has(currentPath);
        const isSelected = value.type === 'file' && selectedFile === currentPath;
        const isChecked = selectedFiles.has(currentPath);

        if (value.type === 'folder') {
          return (
            <div key={currentPath}>
              <button
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted',
                  level > 0 && 'ml-4',
                  isExpanded && 'bg-muted'
                )}
                onClick={() => onToggleFolder(currentPath)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{key}</span>
              </button>

              {isExpanded && value.children && (
                <div className="mt-0.5">
                  <FileTreeNode
                    name={key}
                    node={value.children}
                    path={currentPath}
                    level={level + 1}
                    expandedFolders={expandedFolders}
                    selectedFile={selectedFile}
                    selectedFiles={selectedFiles}
                    onSelectFile={onSelectFile}
                    onToggleFolder={onToggleFolder}
                    onToggleFileSelection={onToggleFileSelection}
                  />
                </div>
              )}
            </div>
          );
        } else {
          return (
            <div
              key={currentPath}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                level > 0 && 'ml-4',
                isSelected && 'bg-muted',
                !isSelected && 'hover:bg-muted'
              )}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggleFileSelection(currentPath)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="flex items-center gap-2 flex-1 min-w-0"
                onClick={() => onSelectFile(currentPath)}
              >
                {getFileIcon(key)}
                <span className="truncate">{key}</span>
              </button>
            </div>
          );
        }
      })}
    </>
  );
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();

  const iconMap: { [key: string]: React.ReactNode } = {
    ts: <FileCode className="h-4 w-4 text-muted-foreground" />,
    tsx: <FileCode className="h-4 w-4 text-muted-foreground" />,
    js: <FileCode className="h-4 w-4 text-muted-foreground" />,
    jsx: <FileCode className="h-4 w-4 text-muted-foreground" />,
    json: <FileJson className="h-4 w-4 text-muted-foreground" />,
    md: <FileText className="h-4 w-4 text-muted-foreground" />,
  };

  return iconMap[ext || ''] || <File className="h-4 w-4 text-muted-foreground" />;
}
