'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Loader2, Bot, User, Sparkles, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  files?: Array<{ path: string; language: string; size: number }>;
  suggestions?: string[];
}

interface ChatInterfaceProps {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  projectId?: string;
  type?: 'requirements' | 'code_generation' | 'debugging' | 'general';
  className?: string;
}

export function ChatInterface({
  sessionId: initialSessionId,
  onSessionCreated,
  projectId,
  type = 'requirements',
  className,
}: ChatInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(
    initialSessionId || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestQueue, setRequestQueue] = useState<Array<{ message: string; model: string }>>([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create session if needed
  const ensureSession = async () => {
    if (sessionId) return sessionId;

    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, type }),
      });

      if (!res.ok) throw new Error('Failed to create session');

      const data = await res.json();
      const newSessionId = data.data.sessionId;

      setSessionId(newSessionId);
      onSessionCreated?.(newSessionId);

      return newSessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  };

  // Process queue
  useEffect(() => {
    const processNextRequest = async () => {
      if (requestQueue.length === 0 || processingQueue) return;

      setProcessingQueue(true);
      const request = requestQueue[0];
      const userMessage = request.message;
      const modelToUse = request.model;

      // Remove from queue
      setRequestQueue((prev) => prev.slice(1));

      // Add user message
      const newUserMessage: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setIsGenerating(true);

      try {
        // Call code generation API
        const res = await fetch('/api/generate/code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            requirements: userMessage,
            model: modelToUse,
            context: {
              conversationHistory: messages.map((m) => ({
                role: m.role,
                content: m.content,
              })),
            },
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to generate code');
        }

        const data = await res.json();

        // Add assistant message with generated files
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.data.explanation,
          timestamp: new Date(),
          files: data.data.files,
          suggestions: data.data.suggestions,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error: any) {
        console.error('Error generating code:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Sorry, an error occurred: ${error.message}. Please try again.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsGenerating(false);
        setProcessingQueue(false);
      }
    };

    processNextRequest();
  }, [requestQueue, processingQueue, projectId, messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !projectId) return;

    const userMessage = input.trim();
    setInput('');

    // Add to queue with current model
    setRequestQueue((prev) => [...prev, { message: userMessage, model: selectedModel }]);
  };

  return (
    <Card className={cn('flex flex-col h-[600px] border-0 shadow-none', className)}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mb-4">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold mb-2">
              Ready to generate code
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              Describe what you want to build, and I'll generate code files for your project.
            </p>
            <div className="mt-6 p-3 rounded-lg bg-muted border max-w-md">
              <p className="text-xs text-muted-foreground mb-1">Example:</p>
              <p className="text-xs">
                "Create a user authentication form with email and password"
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {isGenerating && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex items-center gap-3 flex-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              <div>
                <p className="text-sm font-medium">Generating code...</p>
                <p className="text-xs text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
          </div>
        )}

        {/* Queue indicator */}
        {requestQueue.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-muted border rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <div className="flex-1">
              <p className="text-xs font-medium">
                {requestQueue.length} request{requestQueue.length > 1 ? 's' : ''} in queue
              </p>
              <p className="text-xs text-muted-foreground">Will process after current generation</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-background">
        {/* Model Selector */}
        <div className="px-4 pt-3 pb-2 border-b">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              AI Model
            </span>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-sonnet-4-6">
                  <div className="flex items-center gap-2">
                    <span>Claude Sonnet 4.6</span>
                    <span className="text-xs text-muted-foreground">(Recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="claude-3-haiku-20240307">
                  <div className="flex items-center gap-2">
                    <span>Claude Haiku 3</span>
                    <span className="text-xs text-muted-foreground">(Fast)</span>
                  </div>
                </SelectItem>
                <SelectItem value="claude-3-opus-20240229">
                  <div className="flex items-center gap-2">
                    <span>Claude Opus 3</span>
                    <span className="text-xs text-muted-foreground">(Most Capable)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              {selectedModel === 'claude-sonnet-4-6' && 'Balanced • $3/$15 per MTok'}
              {selectedModel === 'claude-3-haiku-20240307' && 'Fast & Cheap • $0.25/$1.25 per MTok'}
              {selectedModel === 'claude-3-opus-20240229' && 'Most Powerful • $15/$75 per MTok'}
            </span>
          </div>
        </div>

        <form
          onSubmit={sendMessage}
          className="p-4 flex items-center gap-3 relative"
        >
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to build..."
              disabled={!projectId}
              className="flex-1 pr-10"
            />
            {input && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {input.length}/2000
              </span>
            )}
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || !projectId}
          >
            <Send className="h-4 w-4" />
          </Button>
          {requestQueue.length > 0 && (
            <div className="absolute -top-10 right-0 px-3 py-1.5 rounded-md bg-muted border">
              <span className="text-xs font-medium">
                {requestQueue.length} queued
              </span>
            </div>
          )}
        </form>
      </div>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          'rounded-lg px-4 py-3 max-w-[80%] space-y-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {/* Message content */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Generated files */}
        {message.files && message.files.length > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs font-medium">
              <FileCode className="h-3.5 w-3.5" />
              <span>Generated {message.files.length} file(s)</span>
            </div>
            <div className="space-y-1.5">
              {message.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs bg-background rounded-md px-3 py-2 border"
                >
                  <FileCode className="h-3 w-3 shrink-0" />
                  <span className="font-mono text-xs flex-1 truncate">{file.path}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatBytes(file.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="space-y-2 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next steps</span>
            </div>
            <ul className="space-y-2 text-xs">
              {message.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 p-2 rounded-md bg-background border">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="flex-1">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
