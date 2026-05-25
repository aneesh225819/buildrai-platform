import { createChatCompletion } from '../anthropic';
import { ChatMessage } from '@/types';

const CODE_QUALITY_SYSTEM_PROMPT = `You are an expert code quality analyzer. Your job is to:

1. Analyze code for quality issues including:
   - Code style and formatting issues
   - Potential bugs and errors
   - Security vulnerabilities
   - Performance issues
   - Code complexity problems
   - Best practice violations
   - Accessibility issues (for frontend code)

2. For each issue found, provide:
   - Severity level (critical, high, medium, low)
   - Issue description
   - Location (file, line number)
   - Suggested fix
   - Explanation of why it's an issue

3. Generate a code quality score (0-100) based on:
   - Number and severity of issues
   - Code complexity
   - Test coverage (if provided)
   - Documentation quality

4. Provide actionable recommendations for improvement.

Output your analysis in the following JSON structure:
{
  "overallScore": number (0-100),
  "issues": [
    {
      "id": string,
      "severity": "critical" | "high" | "medium" | "low",
      "category": "bug" | "security" | "performance" | "style" | "complexity" | "best-practice",
      "file": string,
      "line": number,
      "message": string,
      "suggestion": string,
      "explanation": string
    }
  ],
  "metrics": {
    "totalIssues": number,
    "criticalIssues": number,
    "highIssues": number,
    "mediumIssues": number,
    "lowIssues": number,
    "averageComplexity": number,
    "maintainabilityIndex": number (0-100)
  },
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "action": string,
      "reason": string,
      "estimatedImpact": string
    }
  ]
}`;

export interface CodeQualityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'bug' | 'security' | 'performance' | 'style' | 'complexity' | 'best-practice';
  file: string;
  line: number;
  message: string;
  suggestion: string;
  explanation: string;
}

export interface CodeQualityMetrics {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  averageComplexity: number;
  maintainabilityIndex: number;
}

export interface CodeQualityRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  estimatedImpact: string;
}

export interface CodeQualityAnalysis {
  overallScore: number;
  issues: CodeQualityIssue[];
  metrics: CodeQualityMetrics;
  recommendations: CodeQualityRecommendation[];
}

export async function analyzeCodeQuality(
  files: Array<{ path: string; content: string; language: string }>,
  framework?: string
): Promise<CodeQualityAnalysis> {
  // Prepare file summaries for analysis
  const fileSummaries = files.map((file) => {
    const lines = file.content.split('\n').length;
    return `File: ${file.path} (${file.language}, ${lines} lines)
\`\`\`${file.language}
${file.content}
\`\`\``;
  }).join('\n\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Analyze the following code files for quality issues. Framework: ${framework || 'Not specified'}

${fileSummaries}

Provide a comprehensive code quality analysis following the specified JSON structure.`,
    },
  ];

  const response = await createChatCompletion(messages, {
    system: CODE_QUALITY_SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 4000,
  });

  // Parse the response
  const firstBlock = response.content[0];
  const content = firstBlock.type === 'text' ? firstBlock.text : '';

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse code quality analysis response');
  }

  const analysis: CodeQualityAnalysis = JSON.parse(jsonMatch[0]);

  return analysis;
}

export async function generateCodeQualityReport(
  projectId: string,
  projectName: string,
  analysis: CodeQualityAnalysis,
  filesAnalyzed: number
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  let report = `# Code Quality Report

**Project:** ${projectName}
**Project ID:** ${projectId}
**Date:** ${dateStr}
**Files Analyzed:** ${filesAnalyzed}

---

## Executive Summary

**Overall Quality Score:** ${analysis.overallScore}/100

`;

  // Score interpretation
  if (analysis.overallScore >= 90) {
    report += '✅ **Excellent** - High quality codebase with minimal issues.\n\n';
  } else if (analysis.overallScore >= 75) {
    report += '✓ **Good** - Good quality code with some areas for improvement.\n\n';
  } else if (analysis.overallScore >= 60) {
    report += '⚠️ **Fair** - Code quality needs attention. Several issues found.\n\n';
  } else {
    report += '❌ **Poor** - Significant quality issues that should be addressed.\n\n';
  }

  // Metrics
  report += `## Metrics

| Metric | Value |
|--------|-------|
| Total Issues | ${analysis.metrics.totalIssues} |
| Critical Issues | ${analysis.metrics.criticalIssues} |
| High Priority Issues | ${analysis.metrics.highIssues} |
| Medium Priority Issues | ${analysis.metrics.mediumIssues} |
| Low Priority Issues | ${analysis.metrics.lowIssues} |
| Average Complexity | ${analysis.metrics.averageComplexity.toFixed(2)} |
| Maintainability Index | ${analysis.metrics.maintainabilityIndex}/100 |

---

## Issues by Severity

`;

  // Group issues by severity
  const criticalIssues = analysis.issues.filter((i) => i.severity === 'critical');
  const highIssues = analysis.issues.filter((i) => i.severity === 'high');
  const mediumIssues = analysis.issues.filter((i) => i.severity === 'medium');
  const lowIssues = analysis.issues.filter((i) => i.severity === 'low');

  if (criticalIssues.length > 0) {
    report += `### ❌ Critical Issues (${criticalIssues.length})

`;
    criticalIssues.forEach((issue, idx) => {
      report += `#### ${idx + 1}. ${issue.message}

- **File:** \`${issue.file}\` (Line ${issue.line})
- **Category:** ${issue.category}
- **Explanation:** ${issue.explanation}
- **Suggestion:** ${issue.suggestion}

`;
    });
  }

  if (highIssues.length > 0) {
    report += `### ⚠️ High Priority Issues (${highIssues.length})

`;
    highIssues.forEach((issue, idx) => {
      report += `#### ${idx + 1}. ${issue.message}

- **File:** \`${issue.file}\` (Line ${issue.line})
- **Category:** ${issue.category}
- **Suggestion:** ${issue.suggestion}

`;
    });
  }

  if (mediumIssues.length > 0) {
    report += `### ⚡ Medium Priority Issues (${mediumIssues.length})

`;
    mediumIssues.slice(0, 10).forEach((issue, idx) => {
      report += `${idx + 1}. **${issue.file}:${issue.line}** - ${issue.message}\n`;
    });
    if (mediumIssues.length > 10) {
      report += `\n_... and ${mediumIssues.length - 10} more medium priority issues._\n`;
    }
    report += '\n';
  }

  if (lowIssues.length > 0) {
    report += `### ℹ️ Low Priority Issues (${lowIssues.length})

`;
    lowIssues.slice(0, 5).forEach((issue, idx) => {
      report += `${idx + 1}. **${issue.file}:${issue.line}** - ${issue.message}\n`;
    });
    if (lowIssues.length > 5) {
      report += `\n_... and ${lowIssues.length - 5} more low priority issues._\n`;
    }
    report += '\n';
  }

  // Recommendations
  report += `---

## Recommendations

`;

  const highPriorityRecs = analysis.recommendations.filter((r) => r.priority === 'high');
  const mediumPriorityRecs = analysis.recommendations.filter((r) => r.priority === 'medium');
  const lowPriorityRecs = analysis.recommendations.filter((r) => r.priority === 'low');

  if (highPriorityRecs.length > 0) {
    report += `### High Priority

`;
    highPriorityRecs.forEach((rec, idx) => {
      report += `${idx + 1}. **${rec.action}**
   - Reason: ${rec.reason}
   - Estimated Impact: ${rec.estimatedImpact}

`;
    });
  }

  if (mediumPriorityRecs.length > 0) {
    report += `### Medium Priority

`;
    mediumPriorityRecs.forEach((rec, idx) => {
      report += `${idx + 1}. **${rec.action}** - ${rec.reason}\n`;
    });
    report += '\n';
  }

  if (lowPriorityRecs.length > 0) {
    report += `### Low Priority

`;
    lowPriorityRecs.forEach((rec, idx) => {
      report += `${idx + 1}. ${rec.action}\n`;
    });
    report += '\n';
  }

  report += `---

## Next Steps

1. Address critical and high-priority issues first
2. Run automated tests to ensure fixes don't introduce regressions
3. Consider setting up automated code quality checks in CI/CD
4. Schedule regular code quality reviews

---

*Generated by BuildrAI Code Quality Analyzer*
`;

  return report;
}
