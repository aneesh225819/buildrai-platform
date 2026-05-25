'use client';

import { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import {
  Save,
  Copy,
  Check,
  Scissors,
  ClipboardPaste,
  MessageSquare,
  WrapText,
  Search,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type * as Monaco from 'monaco-editor';

interface CodeEditorProps {
  file: {
    path: string;
    content: string;
    language: string;
  } | null;
  projectId: string;
  onSave: (content: string) => void;
  className?: string;
}

export function CodeEditor({
  file,
  projectId,
  onSave,
  className,
}: CodeEditorProps) {
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (file) {
      setContent(file.content);
      setHasChanges(false);
      setSaveError(null);
    }
  }, [file]);

  if (!file) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // Call the actual API to save the file
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: file.path,
          content: content,
          language: file.language,
          createdBy: 'user',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save file');
      }

      setHasChanges(false);
      onSave(content);
    } catch (error) {
      console.error('Error saving file:', error);
      setSaveError('Failed to save file. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      const selection = editorRef.current?.getSelection();
      const selectedText = selection
        ? editorRef.current?.getModel()?.getValueInRange(selection)
        : content;
      await navigator.clipboard.writeText(selectedText || content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleCut = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) {
      const selectedText = editor.getModel()?.getValueInRange(selection);
      if (selectedText) {
        await navigator.clipboard.writeText(selectedText);
        editor.executeEdits('', [
          {
            range: selection,
            text: '',
          },
        ]);
      }
    }
  };

  const handlePaste = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      const text = await navigator.clipboard.readText();
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('', [
          {
            range: selection,
            text: text,
          },
        ]);
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
    }
  };

  const handleComment = () => {
    editorRef.current?.trigger('keyboard', 'editor.action.commentLine', {});
  };

  const handleFormat = () => {
    editorRef.current
      ?.getAction('editor.action.formatDocument')
      ?.run();
  };

  const handleFind = () => {
    editorRef.current?.trigger('keyboard', 'actions.find', {});
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add keyboard shortcut for save (Cmd+S / Ctrl+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (hasChanges && !isSaving) {
        handleSave();
      }
    });

    // Add keyboard shortcut for comment (Cmd+/ / Ctrl+/)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      handleComment();
    });

    // Focus the editor
    editor.focus();
  };

  const getLanguage = (lang: string) => {
    const languageMap: { [key: string]: string } = {
      typescript: 'typescript',
      javascript: 'javascript',
      tsx: 'typescript',
      jsx: 'javascript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      python: 'python',
      markdown: 'markdown',
    };

    return languageMap[lang] || 'plaintext';
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {file.language.toUpperCase()}
          </span>
          {hasChanges && (
            <span className="text-xs text-orange-500">• Unsaved changes</span>
          )}
          {saveError && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {saveError}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFind}
            className="gap-2 h-8"
            title="Find (Cmd+F)"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCut}
            className="gap-2 h-8"
            title="Cut (Cmd+X)"
          >
            <Scissors className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="gap-2 h-8"
            title="Copy (Cmd+C)"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            className="gap-2 h-8"
            title="Paste (Cmd+V)"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleComment}
            className="gap-2 h-8"
            title="Toggle Comment (Cmd+/)"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            className="gap-2 h-8"
            title="Format Document"
          >
            <WrapText className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gap-2 h-8"
            title="Save (Cmd+S)"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(file.language)}
          value={content}
          onChange={(value) => {
            setContent(value || '');
            setHasChanges(value !== file.content);
          }}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            rulers: [80, 120],
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            contextmenu: true,
            find: {
              addExtraSpaceOnTop: false,
              autoFindInSelection: 'never',
              seedSearchStringFromSelection: 'always',
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnCommitCharacter: true,
            snippetSuggestions: 'inline',
            wordBasedSuggestions: 'matchingDocuments',
          }}
        />
      </div>
    </div>
  );
}
