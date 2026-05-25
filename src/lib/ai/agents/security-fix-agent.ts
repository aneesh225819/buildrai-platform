import { createChatCompletion } from '../anthropic';
import { SecurityVulnerability } from './security-scan-agent';

const SECURITY_FIX_SYSTEM_PROMPT = `You are an expert security engineer specializing in automated vulnerability remediation. Your job is to:

1. Analyze security vulnerabilities and generate secure code fixes
2. Ensure fixes follow security best practices
3. Maintain code functionality while improving security
4. Provide clear explanations of changes

When fixing vulnerabilities:
- Maintain existing code structure and style
- Add necessary imports and dependencies
- Include comments explaining security improvements
- Ensure fixes don't introduce new vulnerabilities
- Follow language-specific security patterns

Output format:
{
  "fixes": [
    {
      "vulnerabilityId": string,
      "file": string,
      "originalCode": string,
      "fixedCode": string,
      "explanation": string,
      "imports": string[],
      "dependencies": string[]
    }
  ],
  "summary": {
    "totalFixed": number,
    "requiresManualReview": string[],
    "additionalSteps": string[]
  }
}`;

export interface SecurityFix {
  vulnerabilityId: string;
  file: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  imports: string[];
  dependencies: string[];
}

export interface SecurityFixResult {
  fixes: SecurityFix[];
  summary: {
    totalFixed: number;
    requiresManualReview: string[];
    additionalSteps: string[];
  };
}

export async function generateSecurityFixes(
  vulnerabilities: SecurityVulnerability[],
  files: Array<{ path: string; content: string; language: string }>
): Promise<SecurityFixResult> {
  // Focus on fixable vulnerabilities (critical and high)
  const fixableVulns = vulnerabilities.filter(
    (v) => v.severity === 'critical' || v.severity === 'high'
  );

  if (fixableVulns.length === 0) {
    return {
      fixes: [],
      summary: {
        totalFixed: 0,
        requiresManualReview: [],
        additionalSteps: [],
      },
    };
  }

  // Create a map of files for quick lookup
  const fileMap = new Map(files.map((f) => [f.path, f]));

  // Prepare vulnerability details with file content
  const vulnDetails = fixableVulns
    .map((vuln) => {
      const file = fileMap.get(vuln.file);
      if (!file) return null;

      // Extract code around the vulnerability (±10 lines)
      const lines = file.content.split('\n');
      const startLine = Math.max(0, vuln.line - 10);
      const endLine = Math.min(lines.length, vuln.line + 10);
      const codeContext = lines.slice(startLine, endLine).join('\n');

      return `### Vulnerability: ${vuln.title}
**ID:** ${vuln.id}
**Type:** ${vuln.type}
**Severity:** ${vuln.severity}
**File:** ${vuln.file}
**Line:** ${vuln.line}
**CWE:** ${vuln.cwe}

**Description:** ${vuln.description}

**Code Context:**
\`\`\`${file.language}
${codeContext}
\`\`\`

**Remediation Guidance:** ${vuln.remediation}
`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Generate automated security fixes for the following vulnerabilities.

For each vulnerability, provide:
1. The exact original vulnerable code
2. The secure fixed version
3. Explanation of the security improvement
4. Any new imports needed
5. Any dependencies to install

${vulnDetails}

Generate secure code fixes following the specified JSON format.`,
    },
  ];

  const response = await createChatCompletion(messages, {
    system: SECURITY_FIX_SYSTEM_PROMPT,
    temperature: 0.2,
    maxTokens: 8000,
  });

  const firstBlock = response.content[0];
  const content = firstBlock.type === 'text' ? firstBlock.text : '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse security fix response');
  }

  const result: SecurityFixResult = JSON.parse(jsonMatch[0]);

  return result;
}

export async function applySecurityFixes(
  files: Array<{ path: string; content: string }>,
  fixes: SecurityFix[]
): Promise<Array<{ path: string; content: string; changes: string[] }>> {
  const modifiedFiles: Array<{ path: string; content: string; changes: string[] }> = [];
  const fileMap = new Map(files.map((f) => [f.path, { ...f }]));

  for (const fix of fixes) {
    const file = fileMap.get(fix.file);
    if (!file) continue;

    // Apply the fix by replacing original code with fixed code
    let newContent = file.content;

    // Try exact match first
    if (file.content.includes(fix.originalCode)) {
      newContent = file.content.replace(fix.originalCode, fix.fixedCode);
    } else {
      // Try normalized whitespace match
      const normalizedOriginal = fix.originalCode.replace(/\s+/g, ' ').trim();
      const contentLines = file.content.split('\n');

      for (let i = 0; i < contentLines.length; i++) {
        const lineNormalized = contentLines[i].replace(/\s+/g, ' ').trim();
        if (lineNormalized.includes(normalizedOriginal)) {
          contentLines[i] = fix.fixedCode;
          newContent = contentLines.join('\n');
          break;
        }
      }
    }

    if (newContent !== file.content) {
      file.content = newContent;
      const existingFile = modifiedFiles.find((f) => f.path === fix.file);
      if (existingFile) {
        existingFile.content = newContent;
        existingFile.changes.push(fix.vulnerabilityId);
      } else {
        modifiedFiles.push({
          path: fix.file,
          content: newContent,
          changes: [fix.vulnerabilityId],
        });
      }
    }
  }

  return modifiedFiles;
}

export function generateFixSummaryReport(
  projectName: string,
  fixResult: SecurityFixResult,
  appliedFixes: Array<{ path: string; content: string; changes: string[] }>
): string {
  let report = `# 🔧 Security Fix Report

**Project:** ${projectName}
**Date:** ${new Date().toISOString().split('T')[0]}
**Fixes Applied:** ${appliedFixes.length}
**Vulnerabilities Fixed:** ${fixResult.summary.totalFixed}

---

## Summary

`;

  if (fixResult.summary.totalFixed > 0) {
    report += `✅ Successfully generated fixes for ${fixResult.summary.totalFixed} vulnerabilities.\n\n`;
  }

  if (appliedFixes.length > 0) {
    report += `### Modified Files

`;
    appliedFixes.forEach((file, idx) => {
      report += `${idx + 1}. \`${file.path}\` - Fixed ${file.changes.length} vulnerability(ies)\n`;
    });
    report += '\n';
  }

  // Detailed fixes
  report += `## Applied Fixes\n\n`;

  fixResult.fixes.forEach((fix, idx) => {
    report += `### ${idx + 1}. Fix for ${fix.vulnerabilityId}

**File:** \`${fix.file}\`

#### Original Code (Vulnerable)
\`\`\`
${fix.originalCode}
\`\`\`

#### Fixed Code (Secure)
\`\`\`
${fix.fixedCode}
\`\`\`

#### Explanation
${fix.explanation}

`;

    if (fix.imports.length > 0) {
      report += `#### Required Imports
\`\`\`
${fix.imports.join('\n')}
\`\`\`

`;
    }

    if (fix.dependencies.length > 0) {
      report += `#### Required Dependencies
\`\`\`bash
npm install ${fix.dependencies.join(' ')}
\`\`\`

`;
    }

    report += '---\n\n';
  });

  // Manual review needed
  if (fixResult.summary.requiresManualReview.length > 0) {
    report += `## ⚠️ Requires Manual Review

The following issues require manual attention:

`;
    fixResult.summary.requiresManualReview.forEach((issue, idx) => {
      report += `${idx + 1}. ${issue}\n`;
    });
    report += '\n';
  }

  // Additional steps
  if (fixResult.summary.additionalSteps.length > 0) {
    report += `## 📋 Additional Steps Required

`;
    fixResult.summary.additionalSteps.forEach((step, idx) => {
      report += `${idx + 1}. ${step}\n`;
    });
    report += '\n';
  }

  report += `---

## ✅ Next Steps

1. **Review the changes** - Carefully review all security fixes
2. **Test thoroughly** - Run all tests to ensure functionality
3. **Manual fixes** - Address items requiring manual review
4. **Deploy** - Deploy the secured code after validation
5. **Monitor** - Continue monitoring for new vulnerabilities

---

*Generated by BuildrAI Security Fix Agent*
`;

  return report;
}
