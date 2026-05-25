import { createChatCompletion } from '../anthropic';
import { ChatMessage } from '@/types';

const TEST_GENERATION_SYSTEM_PROMPT = `You are an expert test engineer specializing in automated test generation. Your job is to:

1. Analyze code files and generate comprehensive test suites
2. Generate tests that follow best practices for the given framework/language
3. Include:
   - Unit tests for individual functions/methods
   - Integration tests for component interactions
   - Edge cases and error scenarios
   - Happy path and unhappy path scenarios

4. For each test file, provide:
   - Test file path (following conventions like *.test.ts, *.spec.ts, etc.)
   - Complete test code with proper imports
   - Test descriptions and assertions
   - Setup and teardown code if needed
   - Mocks and fixtures where appropriate

5. Generate tests using appropriate testing frameworks:
   - TypeScript/JavaScript: Jest, Vitest, or React Testing Library
   - Python: pytest or unittest
   - etc.

Output your analysis in JSON format:
{
  "testFiles": [
    {
      "path": string,
      "sourceFile": string,
      "content": string,
      "framework": string,
      "testCount": number,
      "coverage": {
        "functions": number,
        "statements": number,
        "branches": number
      }
    }
  ],
  "summary": {
    "totalTests": number,
    "totalTestFiles": number,
    "estimatedCoverage": number,
    "recommendations": string[]
  }
}`;

export interface TestFile {
  path: string;
  sourceFile: string;
  content: string;
  framework: string;
  testCount: number;
  coverage: {
    functions: number;
    statements: number;
    branches: number;
  };
}

export interface TestGenerationResult {
  testFiles: TestFile[];
  summary: {
    totalTests: number;
    totalTestFiles: number;
    estimatedCoverage: number;
    recommendations: string[];
  };
}

export async function generateTests(
  files: Array<{ path: string; content: string; language: string }>,
  framework?: string,
  testingFramework?: string
): Promise<TestGenerationResult> {
  // Filter files that should have tests (exclude config, test files themselves, etc.)
  const testableFiles = files.filter((file) => {
    const excluded = [
      '.config.',
      '.test.',
      '.spec.',
      'node_modules',
      '.next',
      'dist',
      'build',
    ];
    return !excluded.some((pattern) => file.path.includes(pattern));
  });

  if (testableFiles.length === 0) {
    return {
      testFiles: [],
      summary: {
        totalTests: 0,
        totalTestFiles: 0,
        estimatedCoverage: 0,
        recommendations: ['No testable files found in the project.'],
      },
    };
  }

  // Limit to first 10 files for performance
  const filesToTest = testableFiles.slice(0, 10);

  const fileSummaries = filesToTest
    .map((file) => {
      return `File: ${file.path}
\`\`\`${file.language}
${file.content}
\`\`\``;
    })
    .join('\n\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Generate comprehensive test suites for the following code files.

Framework: ${framework || 'Not specified'}
Testing Framework: ${testingFramework || 'Auto-detect based on project'}

${fileSummaries}

Generate tests following best practices for the framework. Include unit tests, integration tests, and edge cases.
Provide the output in the specified JSON format.`,
    },
  ];

  const response = await createChatCompletion(messages, {
    system: TEST_GENERATION_SYSTEM_PROMPT,
    temperature: 0.4,
    maxTokens: 8000,
  });

  const firstBlock = response.content[0];
  const content = firstBlock.type === 'text' ? firstBlock.text : '';

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse test generation response');
  }

  const result: TestGenerationResult = JSON.parse(jsonMatch[0]);

  return result;
}

export async function generateTestForFile(
  filePath: string,
  fileContent: string,
  language: string,
  framework?: string,
  testingFramework?: string
): Promise<TestFile> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Generate a comprehensive test suite for this file:

File: ${filePath}
Language: ${language}
Framework: ${framework || 'Not specified'}
Testing Framework: ${testingFramework || 'Auto-detect'}

\`\`\`${language}
${fileContent}
\`\`\`

Generate a complete test file with:
- Proper imports and setup
- Unit tests for all functions/methods
- Edge cases and error scenarios
- Mocks for external dependencies
- Clear test descriptions

Output in JSON format:
{
  "path": "test file path",
  "sourceFile": "${filePath}",
  "content": "complete test file content",
  "framework": "testing framework used",
  "testCount": number of tests,
  "coverage": {
    "functions": estimated percentage,
    "statements": estimated percentage,
    "branches": estimated percentage
  }
}`,
    },
  ];

  const response = await createChatCompletion(messages, {
    system: TEST_GENERATION_SYSTEM_PROMPT,
    temperature: 0.4,
    maxTokens: 4000,
  });

  const firstBlock = response.content[0];
  const content = firstBlock.type === 'text' ? firstBlock.text : '';

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse test generation response');
  }

  const testFile: TestFile = JSON.parse(jsonMatch[0]);

  return testFile;
}

export function generateTestingSummaryReport(
  projectName: string,
  result: TestGenerationResult
): string {
  let report = `# Test Generation Report

**Project:** ${projectName}
**Date:** ${new Date().toISOString().split('T')[0]}

---

## Summary

- **Total Test Files Generated:** ${result.summary.totalTestFiles}
- **Total Tests:** ${result.summary.totalTests}
- **Estimated Coverage:** ${result.summary.estimatedCoverage}%

`;

  if (result.summary.estimatedCoverage >= 80) {
    report += '✅ **Excellent** - High test coverage achieved.\n\n';
  } else if (result.summary.estimatedCoverage >= 60) {
    report += '✓ **Good** - Decent test coverage, room for improvement.\n\n';
  } else {
    report += '⚠️ **Fair** - Test coverage could be improved.\n\n';
  }

  // Test files
  report += `## Generated Test Files\n\n`;

  result.testFiles.forEach((testFile, idx) => {
    report += `### ${idx + 1}. \`${testFile.path}\`

- **Source File:** \`${testFile.sourceFile}\`
- **Testing Framework:** ${testFile.framework}
- **Number of Tests:** ${testFile.testCount}
- **Coverage Estimates:**
  - Functions: ${testFile.coverage.functions}%
  - Statements: ${testFile.coverage.statements}%
  - Branches: ${testFile.coverage.branches}%

`;
  });

  // Recommendations
  if (result.summary.recommendations.length > 0) {
    report += `## Recommendations\n\n`;
    result.summary.recommendations.forEach((rec, idx) => {
      report += `${idx + 1}. ${rec}\n`;
    });
    report += '\n';
  }

  report += `---

## Next Steps

1. Review generated tests and adjust as needed
2. Run tests to verify they pass
3. Add additional edge cases if necessary
4. Integrate tests into CI/CD pipeline
5. Monitor code coverage over time

---

*Generated by BuildrAI Test Generation Agent*
`;

  return report;
}
