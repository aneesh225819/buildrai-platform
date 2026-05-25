'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileExplorer } from './file-explorer';
import { CodeEditor } from './code-editor';
import { ChatInterface } from '../chat/chat-interface';
import { ProjectSettingsDialog } from './project-settings-dialog';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Download,
  GitBranch,
  Play,
  Settings,
  MessageSquare,
  Code2,
  Loader2,
  ArrowLeft,
  Home,
  Folder,
  FileCode,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface ProjectWorkspaceProps {
  projectId: string;
}

export function ProjectWorkspace({ projectId }: ProjectWorkspaceProps) {
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      const data = await res.json();
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Project not found</p>
      </div>
    );
  }

  // Tab management handlers
  const handleOpenFile = (filePath: string) => {
    // Add to tabs if not already open
    if (!openTabs.includes(filePath)) {
      setOpenTabs([...openTabs, filePath]);
    }
    // Set as active tab
    setActiveTab(filePath);
  };

  const handleCloseTab = (filePath: string) => {
    const newTabs = openTabs.filter((tab) => tab !== filePath);
    setOpenTabs(newTabs);

    // If closing active tab, switch to another tab
    if (filePath === activeTab) {
      const index = openTabs.indexOf(filePath);
      if (newTabs.length > 0) {
        // Switch to previous tab if available, otherwise next tab
        const newActiveTab = newTabs[Math.max(0, index - 1)];
        setActiveTab(newActiveTab);
      } else {
        setActiveTab(null);
      }
    }
  };

  const activeFileData = project.files?.find(
    (f: any) => f.path === activeTab
  );

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Enhanced Header */}
      <header className="border-b bg-white/80 backdrop-blur-xl dark:bg-slate-900/80 shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                <span className="font-medium">Back</span>
              </Button>
            </Link>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent dark:via-slate-700" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-sm">
                <Code2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white">{project.name}</h1>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {project.settings.framework}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 dark:text-slate-400 font-medium">{project.settings.language}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" className="gap-2 shadow-sm hover:shadow-md hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950 transition-all">
              <Play className="h-4 w-4" />
              Run
            </Button>
            <Button variant="outline" size="sm" className="gap-2 shadow-sm hover:shadow-md hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 dark:hover:bg-blue-950 transition-all">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2 shadow-sm hover:shadow-md hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 dark:hover:bg-purple-950 transition-all">
              <GitBranch className="h-4 w-4" />
              GitHub
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          {/* File Explorer */}
          <ResizablePanel defaultSize={20} minSize={15}>
            <div className="h-full border-r bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="border-b bg-white/60 dark:bg-slate-900/60 p-3 backdrop-blur-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <div className="p-1 rounded bg-slate-200 dark:bg-slate-800">
                    <Folder className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                  </div>
                  Files
                </h2>
              </div>
              <FileExplorer
                files={project.files || []}
                selectedFile={activeTab}
                onSelectFile={handleOpenFile}
                projectId={projectId}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-1 bg-border" />

          {/* Main Content Area */}
          <ResizablePanel defaultSize={showChat ? 50 : 80}>
            <div className="h-full flex flex-col bg-background">
              {activeTab ? (
                <>
                  {/* Multi-Tab Bar */}
                  <div className="border-b bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
                    <div className="flex items-center px-2 h-11 overflow-x-auto scrollbar-thin">
                      {openTabs.map((tabPath) => (
                        <div
                          key={tabPath}
                          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-t-lg border-t border-x cursor-pointer group transition-colors ${
                            tabPath === activeTab
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                          onClick={() => setActiveTab(tabPath)}
                        >
                          <FileCode className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                            {tabPath}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseTab(tabPath);
                            }}
                            className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded p-0.5 transition-opacity"
                            aria-label="Close tab"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Code Editor */}
                  <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
                    <CodeEditor
                      file={activeFileData}
                      projectId={projectId}
                      onSave={(content) => {
                        console.log('Saving file:', activeTab, content);
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center p-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mb-4">
                    <Code2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">No file selected</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Select a file from the explorer to view or edit
                  </p>
                </div>
              )}
            </div>
          </ResizablePanel>

          {showChat && (
            <>
              <ResizableHandle className="w-1 bg-border" />

              {/* Chat Panel */}
              <ResizablePanel defaultSize={30} minSize={25}>
                <div className="h-full border-l bg-background flex flex-col">
                  <div className="border-b p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <h2 className="text-sm font-semibold">AI Assistant</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowChat(false)}
                      className="h-8 w-8 p-0"
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ChatInterface
                      projectId={projectId}
                      type="code_generation"
                      className="h-full border-0"
                    />
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Chat Toggle Button */}
      {!showChat && (
        <Button
          className="fixed bottom-6 right-6 rounded-full h-12 w-12 shadow-lg"
          size="icon"
          onClick={() => setShowChat(true)}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}

      {/* Project Settings Dialog */}
      {project && (
        <ProjectSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          project={project}
        />
      )}
    </div>
  );
}
