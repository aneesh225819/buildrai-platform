import { createChatCompletion, MODELS } from './anthropic';

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface CodeGenerationResult {
  files: GeneratedFile[];
  explanation: string;
  suggestions: string[];
}

/**
 * Generate code files based on user requirements
 */
export async function generateCode(
  requirements: string,
  projectSettings: {
    template: string;
    language: string;
    framework: string;
    packageManager?: string;
    styling?: string;
  },
  context?: {
    existingFiles?: Array<{ path: string; content: string }>;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  },
  model?: string
): Promise<CodeGenerationResult> {
  // Build system prompt based on project settings
  const systemPrompt = `You are an expert software developer. Generate production-ready code files based on user requirements.

Project Configuration:
- Template: ${projectSettings.template}
- Language: ${projectSettings.language}
- Framework: ${projectSettings.framework}
- Package Manager: ${projectSettings.packageManager || 'npm'}
- Styling: ${projectSettings.styling || 'css'}

IMPORTANT INSTRUCTIONS:
1. Generate complete, production-ready code files
2. Follow best practices and industry standards
3. Include proper error handling and validation
4. Add helpful comments where necessary
5. Format your response EXACTLY as shown below

RESPONSE FORMAT:
First, provide a brief explanation of what you're building.

Then, for each file, use this exact format:

===FILE: path/to/file.ext===
<file content here>
===END FILE===

Finally, provide 2-3 suggestions for next steps or improvements.

Example:
I'll create a simple React component with TypeScript.

===FILE: src/components/Button.tsx===
import React from 'react';

export interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};
===END FILE===

===FILE: src/components/Button.test.tsx===
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders and handles clicks', () => {
    const handleClick = jest.fn();
    render(<Button label="Click me" onClick={handleClick} />);

    const button = screen.getByText('Click me');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
===END FILE===

Suggestions:
1. Add TypeScript types for better type safety
2. Consider adding loading and disabled states
3. Add accessibility attributes (aria-label, role)
`;

  // Prepare conversation history
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add existing conversation if provided
  if (context?.conversationHistory) {
    messages.push(...context.conversationHistory);
  }

  // Add current requirements
  let userMessage = `Generate code for the following requirements:\n\n${requirements}`;

  // Add context about existing files if provided
  if (context?.existingFiles && context.existingFiles.length > 0) {
    userMessage += `\n\nExisting files in the project:\n`;
    context.existingFiles.forEach((file) => {
      userMessage += `- ${file.path}\n`;
    });
    userMessage += `\nYou can reference or extend these files as needed.`;
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });

  // Call Claude API
  const response = await createChatCompletion(messages, {
    model: model || MODELS.SONNET,
    maxTokens: 8000, // Increased for code generation
    temperature: 0.3, // Lower temperature for more consistent code
    system: systemPrompt,
  });

  // Extract content from response
  const content =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse the response to extract files
  const files = parseGeneratedFiles(content);

  // Extract explanation and suggestions
  const { explanation, suggestions } = parseMetadata(content);

  return {
    files,
    explanation,
    suggestions,
  };
}

/**
 * Parse generated files from Claude's response
 */
function parseGeneratedFiles(content: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const fileRegex = /===FILE: (.+?)===\n([\s\S]*?)===END FILE===/g;

  let match;
  while ((match = fileRegex.exec(content)) !== null) {
    const path = match[1].trim();
    const fileContent = match[2].trim();
    const language = detectLanguage(path);

    files.push({
      path,
      content: fileContent,
      language,
    });
  }

  return files;
}

/**
 * Parse explanation and suggestions from response
 */
function parseMetadata(content: string): {
  explanation: string;
  suggestions: string[];
} {
  // Extract text before first file
  const beforeFiles = content.split('===FILE:')[0].trim();

  // Extract suggestions section
  const suggestionsMatch = content.match(
    /Suggestions?:?\s*\n([\s\S]*?)(?=\n\n===FILE:|$)/i
  );

  let suggestions: string[] = [];
  if (suggestionsMatch) {
    const suggestionText = suggestionsMatch[1].trim();
    // Parse numbered or bulleted list
    suggestions = suggestionText
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.replace(/^\d+\.\s*|-\s*/, '').trim())
      .filter((line) => line.length > 0);
  }

  // Extract everything after the last file until suggestions
  let explanation = beforeFiles;
  const lastFileEnd = content.lastIndexOf('===END FILE===');
  if (lastFileEnd !== -1 && suggestionsMatch) {
    const afterFiles = content
      .substring(lastFileEnd + '===END FILE==='.length, suggestionsMatch.index)
      .trim();
    if (afterFiles) {
      explanation = afterFiles;
    }
  }

  return {
    explanation: explanation || 'Generated code files based on your requirements.',
    suggestions,
  };
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();

  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
    xml: 'xml',
  };

  return languageMap[ext || ''] || 'plaintext';
}

/**
 * Generate a specific file or update an existing one
 */
export async function generateSingleFile(
  requirement: string,
  filePath: string,
  projectSettings: any,
  existingContent?: string
): Promise<string> {
  const systemPrompt = `You are an expert software developer. Generate or update a single file based on the requirement.

Project Configuration:
- Language: ${projectSettings.language}
- Framework: ${projectSettings.framework}

IMPORTANT: Respond with ONLY the file content. Do not include any explanations, markdown formatting, or file markers. Just the raw file content.`;

  let userMessage = existingContent
    ? `Update the following file at ${filePath} according to this requirement:\n\n${requirement}\n\nExisting content:\n\`\`\`\n${existingContent}\n\`\`\``
    : `Create a file at ${filePath} for:\n\n${requirement}`;

  const response = await createChatCompletion(
    [
      {
        role: 'user',
        content: userMessage,
      },
    ],
    {
      model: MODELS.SONNET,
      maxTokens: 4000,
      temperature: 0.2,
      system: systemPrompt,
    }
  );

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
