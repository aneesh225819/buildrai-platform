import { createChatCompletion } from '../anthropic';

const SECURITY_SCAN_SYSTEM_PROMPT = `You are an expert security analyst specializing in application security and vulnerability detection. Your job is to:

1. Perform comprehensive security analysis including:
   - OWASP Top 10 vulnerabilities
   - SQL Injection vulnerabilities
   - Cross-Site Scripting (XSS)
   - Cross-Site Request Forgery (CSRF)
   - Authentication and authorization flaws
   - Sensitive data exposure
   - Security misconfigurations
   - Insecure deserialization
   - Components with known vulnerabilities
   - Insufficient logging and monitoring

2. Detect secrets and sensitive data:
   - API keys and tokens
   - Passwords and credentials
   - Private keys and certificates
   - Database connection strings
   - AWS/Cloud provider credentials
   - OAuth tokens
   - Encryption keys

3. Identify security best practice violations:
   - Hardcoded credentials
   - Unsafe cryptographic practices
   - Improper error handling
   - Missing input validation
   - Insecure file operations
   - Command injection risks
   - Path traversal vulnerabilities

4. For each vulnerability found, provide:
   - Severity level (critical, high, medium, low)
   - CWE (Common Weakness Enumeration) ID
   - OWASP category
   - Detailed description
   - Affected code location
   - Exploitation scenario
   - Remediation steps
   - Code examples of fixes

5. Generate security score (0-100) and risk assessment

Output your analysis in JSON format:
{
  "securityScore": number (0-100),
  "riskLevel": "critical" | "high" | "medium" | "low",
  "vulnerabilities": [
    {
      "id": string,
      "severity": "critical" | "high" | "medium" | "low",
      "type": string,
      "cwe": string,
      "owasp": string,
      "file": string,
      "line": number,
      "title": string,
      "description": string,
      "exploitation": string,
      "remediation": string,
      "codeExample": string
    }
  ],
  "secrets": [
    {
      "type": string,
      "file": string,
      "line": number,
      "description": string,
      "severity": "critical" | "high" | "medium"
    }
  ],
  "summary": {
    "totalVulnerabilities": number,
    "criticalCount": number,
    "highCount": number,
    "mediumCount": number,
    "lowCount": number,
    "secretsFound": number
  },
  "recommendations": [
    {
      "priority": "critical" | "high" | "medium" | "low",
      "action": string,
      "reason": string,
      "impact": string
    }
  ]
}`;

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  cwe: string;
  owasp: string;
  file: string;
  line: number;
  title: string;
  description: string;
  exploitation: string;
  remediation: string;
  codeExample: string;
}

export interface SecretDetection {
  type: string;
  file: string;
  line: number;
  description: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface SecurityRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  impact: string;
}

export interface SecurityScanResult {
  securityScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  vulnerabilities: SecurityVulnerability[];
  secrets: SecretDetection[];
  summary: {
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    secretsFound: number;
  };
  recommendations: SecurityRecommendation[];
}

export async function performSecurityScan(
  files: Array<{ path: string; content: string; language: string }>,
  framework?: string
): Promise<SecurityScanResult> {
  // Prepare file summaries for analysis
  const fileSummaries = files
    .map((file) => {
      const lines = file.content.split('\n').length;
      return `File: ${file.path} (${file.language}, ${lines} lines)
\`\`\`${file.language}
${file.content}
\`\`\``;
    })
    .join('\n\n');

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Perform a comprehensive security analysis on the following code files.

Framework: ${framework || 'Not specified'}

Focus on:
1. OWASP Top 10 vulnerabilities
2. Hardcoded secrets and credentials
3. Authentication and authorization issues
4. Data validation and sanitization
5. Cryptographic weaknesses
6. API security issues
7. Injection vulnerabilities
8. Security misconfigurations

${fileSummaries}

Provide a detailed security analysis following the specified JSON structure.`,
    },
  ];

  const response = await createChatCompletion(messages, {
    system: SECURITY_SCAN_SYSTEM_PROMPT,
    temperature: 0.2,
    maxTokens: 8000,
  });

  const firstBlock = response.content[0];
  const content = firstBlock.type === 'text' ? firstBlock.text : '';

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse security scan response');
  }

  const result: SecurityScanResult = JSON.parse(jsonMatch[0]);

  return result;
}

export async function scanDependencies(
  packageJsonContent: string,
  lockFileContent?: string
): Promise<{
  vulnerabilities: Array<{
    package: string;
    version: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    cve: string;
    description: string;
    patchedVersion?: string;
  }>;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `Analyze the following package.json file for known security vulnerabilities in dependencies.

package.json:
\`\`\`json
${packageJsonContent}
\`\`\`

${lockFileContent ? `Lock file:\n\`\`\`\n${lockFileContent}\n\`\`\`\n` : ''}

Identify:
1. Dependencies with known CVEs
2. Outdated packages with security issues
3. Vulnerable transitive dependencies
4. Deprecated packages with security concerns

Output in JSON format:
{
  "vulnerabilities": [
    {
      "package": "package-name",
      "version": "current-version",
      "severity": "critical" | "high" | "medium" | "low",
      "cve": "CVE-ID or description",
      "description": "vulnerability description",
      "patchedVersion": "safe version"
    }
  ],
  "summary": {
    "total": number,
    "critical": number,
    "high": number,
    "medium": number,
    "low": number
  }
}`,
    },
  ];

  const response = await createChatCompletion(messages, {
    system: 'You are a security expert specializing in dependency vulnerability analysis. Analyze dependencies for known security issues and provide actionable remediation advice.',
    temperature: 0.2,
    maxTokens: 4000,
  });

  const firstBlock = response.content[0];
  const content = firstBlock.type === 'text' ? firstBlock.text : '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse dependency scan response');
  }

  return JSON.parse(jsonMatch[0]);
}

export function generateSecurityReport(
  projectId: string,
  projectName: string,
  scanResult: SecurityScanResult,
  dependencyVulns?: any
): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  let report = `# 🔒 Security Scan Report

**Project:** ${projectName}
**Project ID:** ${projectId}
**Scan Date:** ${dateStr}
**Security Score:** ${scanResult.securityScore}/100
**Risk Level:** ${scanResult.riskLevel.toUpperCase()}

---

## Executive Summary

`;

  // Risk level interpretation
  if (scanResult.riskLevel === 'critical') {
    report += '🚨 **CRITICAL RISK** - Immediate action required! Critical security vulnerabilities detected.\n\n';
  } else if (scanResult.riskLevel === 'high') {
    report += '⚠️ **HIGH RISK** - Significant security issues found. Address promptly.\n\n';
  } else if (scanResult.riskLevel === 'medium') {
    report += '⚡ **MEDIUM RISK** - Some security concerns identified. Review and address.\n\n';
  } else {
    report += '✅ **LOW RISK** - Good security posture with minor issues.\n\n';
  }

  // Summary metrics
  report += `### Summary

| Metric | Count |
|--------|-------|
| Total Vulnerabilities | ${scanResult.summary.totalVulnerabilities} |
| Critical Vulnerabilities | ${scanResult.summary.criticalCount} |
| High Severity | ${scanResult.summary.highCount} |
| Medium Severity | ${scanResult.summary.mediumCount} |
| Low Severity | ${scanResult.summary.lowCount} |
| Secrets Detected | ${scanResult.summary.secretsFound} |

---

`;

  // Secrets found
  if (scanResult.secrets.length > 0) {
    report += `## 🔑 Secrets and Credentials Detected

**⚠️ CRITICAL: ${scanResult.secrets.length} hardcoded secret(s) found!**

`;
    scanResult.secrets.forEach((secret, idx) => {
      report += `### ${idx + 1}. ${secret.type}

- **File:** \`${secret.file}\` (Line ${secret.line})
- **Severity:** ${secret.severity.toUpperCase()}
- **Description:** ${secret.description}

**⚠️ ACTION REQUIRED:**
1. Remove the hardcoded secret immediately
2. Rotate/regenerate the compromised credential
3. Use environment variables or secret management service
4. Update all services using this credential

---

`;
    });
  }

  // Vulnerabilities by severity
  const criticalVulns = scanResult.vulnerabilities.filter((v) => v.severity === 'critical');
  const highVulns = scanResult.vulnerabilities.filter((v) => v.severity === 'high');
  const mediumVulns = scanResult.vulnerabilities.filter((v) => v.severity === 'medium');
  const lowVulns = scanResult.vulnerabilities.filter((v) => v.severity === 'low');

  if (criticalVulns.length > 0) {
    report += `## 🚨 Critical Vulnerabilities (${criticalVulns.length})

`;
    criticalVulns.forEach((vuln, idx) => {
      report += `### ${idx + 1}. ${vuln.title}

**Severity:** CRITICAL
**Type:** ${vuln.type}
**CWE:** ${vuln.cwe}
**OWASP:** ${vuln.owasp}
**Location:** \`${vuln.file}:${vuln.line}\`

#### Description
${vuln.description}

#### Exploitation Scenario
${vuln.exploitation}

#### Remediation
${vuln.remediation}

#### Example Fix
\`\`\`
${vuln.codeExample}
\`\`\`

---

`;
    });
  }

  if (highVulns.length > 0) {
    report += `## ⚠️ High Severity Vulnerabilities (${highVulns.length})

`;
    highVulns.forEach((vuln, idx) => {
      report += `### ${idx + 1}. ${vuln.title}

**Type:** ${vuln.type} | **CWE:** ${vuln.cwe} | **OWASP:** ${vuln.owasp}
**Location:** \`${vuln.file}:${vuln.line}\`

${vuln.description}

**Remediation:** ${vuln.remediation}

---

`;
    });
  }

  if (mediumVulns.length > 0) {
    report += `## ⚡ Medium Severity Vulnerabilities (${mediumVulns.length})

`;
    mediumVulns.slice(0, 10).forEach((vuln, idx) => {
      report += `${idx + 1}. **${vuln.title}** - \`${vuln.file}:${vuln.line}\` (${vuln.type})\n`;
    });
    if (mediumVulns.length > 10) {
      report += `\n_... and ${mediumVulns.length - 10} more medium severity vulnerabilities._\n`;
    }
    report += '\n';
  }

  if (lowVulns.length > 0) {
    report += `## ℹ️ Low Severity Vulnerabilities (${lowVulns.length})

`;
    lowVulns.slice(0, 5).forEach((vuln, idx) => {
      report += `${idx + 1}. ${vuln.title} - \`${vuln.file}:${vuln.line}\`\n`;
    });
    if (lowVulns.length > 5) {
      report += `\n_... and ${lowVulns.length - 5} more low severity vulnerabilities._\n`;
    }
    report += '\n';
  }

  // Dependency vulnerabilities
  if (dependencyVulns && dependencyVulns.vulnerabilities.length > 0) {
    report += `---

## 📦 Dependency Vulnerabilities

Found ${dependencyVulns.summary.total} vulnerable dependencies:

`;
    dependencyVulns.vulnerabilities.forEach((vuln: any, idx: number) => {
      report += `${idx + 1}. **${vuln.package}@${vuln.version}** (${vuln.severity})
   - ${vuln.description}
   - CVE: ${vuln.cve}
   - Fix: Upgrade to ${vuln.patchedVersion || 'latest version'}

`;
    });
  }

  // Recommendations
  report += `---

## 📋 Recommendations

`;

  const criticalRecs = scanResult.recommendations.filter((r) => r.priority === 'critical');
  const highRecs = scanResult.recommendations.filter((r) => r.priority === 'high');
  const mediumRecs = scanResult.recommendations.filter((r) => r.priority === 'medium');

  if (criticalRecs.length > 0) {
    report += `### 🚨 Critical Priority

`;
    criticalRecs.forEach((rec, idx) => {
      report += `${idx + 1}. **${rec.action}**
   - Reason: ${rec.reason}
   - Impact: ${rec.impact}

`;
    });
  }

  if (highRecs.length > 0) {
    report += `### ⚠️ High Priority

`;
    highRecs.forEach((rec, idx) => {
      report += `${idx + 1}. **${rec.action}**
   - ${rec.reason}

`;
    });
  }

  if (mediumRecs.length > 0) {
    report += `### ⚡ Medium Priority

`;
    mediumRecs.forEach((rec, idx) => {
      report += `${idx + 1}. ${rec.action}\n`;
    });
  }

  report += `

---

## ✅ Next Steps

1. **Immediate Actions:**
   - Remove all hardcoded secrets
   - Fix critical vulnerabilities
   - Update vulnerable dependencies

2. **Short-term (1-2 weeks):**
   - Address high severity vulnerabilities
   - Implement recommended security controls
   - Set up automated security scanning

3. **Long-term:**
   - Establish secure coding practices
   - Implement security testing in CI/CD
   - Regular security audits and reviews
   - Security training for development team

---

## 🛡️ Security Best Practices

- Never commit secrets to version control
- Use environment variables for configuration
- Implement input validation and sanitization
- Use parameterized queries for database access
- Keep dependencies up to date
- Follow principle of least privilege
- Implement proper error handling
- Use HTTPS for all communications
- Enable security headers
- Regular security testing and audits

---

*Generated by BuildrAI Security Scanner*
*Scan ID: ${projectId}-${Date.now()}*
`;

  return report;
}
