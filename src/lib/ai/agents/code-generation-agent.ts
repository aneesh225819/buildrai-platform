import { createChatCompletion } from '../anthropic';

export interface ProjectPlan {
  fileStructure: {
    [directory: string]: string[];
  };
  tasks: Array<{
    id: number;
    title: string;
    priority: 'high' | 'medium' | 'low';
    estimatedTime: string;
    dependencies: number[];
  }>;
  dependencies: string[];
  totalEstimatedTime: string;
}

export interface Architecture {
  pattern: string;
  components: Array<{
    name: string;
    type: string;
    description: string;
    dependencies: string[];
  }>;
  dataFlow: string;
  diagram: string; // Mermaid diagram
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  explanation: string;
}

/**
 * Planning Agent
 * Creates development plan and task breakdown
 */
export async function createProjectPlan(
  requirements: string,
  techStack: {
    template: string;
    framework: string;
    language: string;
    styling: string;
  }
): Promise<ProjectPlan> {
  const prompt = `You are a planning agent. Create a detailed development plan for this project:

Requirements:
${requirements}

Technology Stack:
- Template: ${techStack.template}
- Framework: ${techStack.framework}
- Language: ${techStack.language}
- Styling: ${techStack.styling}

Create a comprehensive plan including:
1. File structure (directories and files)
2. Development tasks with priorities
3. Required dependencies
4. Estimated timeline

Return as JSON with this structure:
{
  "fileStructure": {
    "src/": ["app.ts", "index.ts"],
    "src/components/": ["Button.tsx"]
  },
  "tasks": [
    {
      "id": 1,
      "title": "Setup project structure",
      "priority": "high",
      "estimatedTime": "15 minutes",
      "dependencies": []
    }
  ],
  "dependencies": ["react", "next"],
  "totalEstimatedTime": "4 hours"
}`;

  const response = await createChatCompletion(
    [{ role: 'user', content: prompt }],
    {
      temperature: 0.3,
      maxTokens: 3000,
    }
  );

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';

  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse project plan:', error);
    throw new Error('Failed to generate project plan');
  }
}

/**
 * Architecture Agent
 * Designs system architecture
 */
export async function designArchitecture(
  requirements: string,
  techStack: any
): Promise<Architecture> {
  const prompt = `Design a system architecture for:

Requirements:
${requirements}

Tech Stack:
${JSON.stringify(techStack, null, 2)}

Consider:
- Scalability
- Maintainability
- Security
- Performance

Provide:
1. Architecture pattern (monolithic/microservices/serverless)
2. Component breakdown with dependencies
3. Data flow description
4. Mermaid diagram code

Return as JSON.`;

  const response = await createChatCompletion(
    [{ role: 'user', content: prompt }],
    {
      temperature: 0.3,
      maxTokens: 3000,
    }
  );

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';

  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse architecture:', error);
    throw new Error('Failed to design architecture');
  }
}

/**
 * Code Generation Agent
 * Generates source code files
 */
export async function generateCode(
  fileName: string,
  description: string,
  techStack: any,
  context?: {
    existingFiles?: string[];
    dependencies?: string[];
  }
): Promise<GeneratedFile> {
  const prompt = `Generate code for this file:

File: ${fileName}
Description: ${description}
Tech Stack: ${JSON.stringify(techStack)}
${context?.existingFiles ? `\nExisting Files: ${context.existingFiles.join(', ')}` : ''}
${context?.dependencies ? `\nDependencies: ${context.dependencies.join(', ')}` : ''}

Requirements:
- Follow best practices
- Include TypeScript types (if applicable)
- Add JSDoc comments
- Handle errors properly
- Include accessibility features (for UI components)
- Write clean, maintainable code

Generate complete, production-ready code with explanations.

Return as JSON:
{
  "path": "${fileName}",
  "content": "// your code here",
  "language": "typescript",
  "explanation": "Brief explanation of key decisions"
}`;

  const response = await createChatCompletion(
    [{ role: 'user', content: prompt }],
    {
      temperature: 0.5,
      maxTokens: 4096,
    }
  );

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';

  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse generated code:', error);
    throw new Error('Failed to generate code');
  }
}

/**
 * Review Agent
 * Reviews and improves generated code
 */
export async function reviewCode(
  file: GeneratedFile
): Promise<{
  issues: Array<{
    severity: 'critical' | 'major' | 'minor' | 'info';
    type: string;
    line?: number;
    message: string;
    suggestion: string;
  }>;
  suggestions: string[];
  improvedCode?: string;
}> {
  const prompt = `Review this code:

File: ${file.path}
Language: ${file.language}

\`\`\`${file.language}
${file.content}
\`\`\`

Check for:
1. Code quality issues
2. Performance problems
3. Security vulnerabilities
4. Accessibility issues (if UI)
5. Best practices violations

Provide:
- Issues found with severity
- Suggestions for improvement
- Improved code if significant issues found

Return as JSON.`;

  const response = await createChatCompletion(
    [{ role: 'user', content: prompt }],
    {
      temperature: 0.3,
      maxTokens: 3000,
    }
  );

  const content = response.content[0];
  const text = content.type === 'text' ? content.text : '';

  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse review results:', error);
    return {
      issues: [],
      suggestions: ['Review could not be completed'],
    };
  }
}

/**
 * Orchestrate Code Generation
 * Coordinates all agents to generate a complete project
 */
export async function generateProject(
  requirements: string,
  techStack: any,
  onProgress?: (step: string, progress: number) => void
): Promise<{
  plan: ProjectPlan;
  architecture: Architecture;
  files: GeneratedFile[];
}> {
  try {
    // Step 1: Create plan
    onProgress?.('Creating project plan...', 10);
    const plan = await createProjectPlan(requirements, techStack);

    // Step 2: Design architecture
    onProgress?.('Designing architecture...', 25);
    const architecture = await designArchitecture(requirements, techStack);

    // Step 3: Generate core files
    onProgress?.('Generating files...', 40);
    const files: GeneratedFile[] = [];

    // Generate package.json
    files.push(
      await generateCode('package.json', 'Package configuration', techStack, {
        dependencies: plan.dependencies,
      })
    );

    // Generate main files based on template
    const mainFiles = getMainFilesForTemplate(techStack.template);

    for (let i = 0; i < mainFiles.length; i++) {
      const file = mainFiles[i];
      onProgress?.(
        `Generating ${file.name}...`,
        40 + ((i + 1) / mainFiles.length) * 40
      );

      const generatedFile = await generateCode(
        file.path,
        file.description,
        techStack,
        {
          existingFiles: files.map((f) => f.path),
          dependencies: plan.dependencies,
        }
      );

      files.push(generatedFile);
    }

    // Step 4: Review (optional, for critical files)
    onProgress?.('Reviewing code...', 90);

    // Generate README
    files.push(
      await generateCode(
        'README.md',
        'Project README with setup instructions',
        techStack,
        {
          existingFiles: files.map((f) => f.path),
        }
      )
    );

    onProgress?.('Complete!', 100);

    return {
      plan,
      architecture,
      files,
    };
  } catch (error) {
    console.error('Error generating project:', error);
    throw error;
  }
}

function getMainFilesForTemplate(template: string): Array<{
  path: string;
  name: string;
  description: string;
}> {
  const templates: Record<string, any> = {
    nextjs: [
      {
        path: 'src/app/page.tsx',
        name: 'Home Page',
        description: 'Main home page component',
      },
      {
        path: 'src/app/layout.tsx',
        name: 'Root Layout',
        description: 'Root layout with providers',
      },
      {
        path: 'tailwind.config.js',
        name: 'Tailwind Config',
        description: 'Tailwind CSS configuration',
      },
    ],
    react: [
      {
        path: 'src/App.tsx',
        name: 'App Component',
        description: 'Main app component',
      },
      {
        path: 'src/main.tsx',
        name: 'Entry Point',
        description: 'Application entry point',
      },
    ],
    nodejs: [
      {
        path: 'src/index.ts',
        name: 'Entry Point',
        description: 'Server entry point',
      },
      {
        path: 'src/app.ts',
        name: 'App Configuration',
        description: 'Express app configuration',
      },
    ],
  };

  return templates[template] || templates.react;
}
