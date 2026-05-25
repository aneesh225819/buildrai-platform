'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Key,
  Lock,
  Unlock,
  Loader2,
  Download,
  Wrench,
  AlertCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface SecurityDashboardProps {
  projectId: string;
}

export function SecurityDashboard({ projectId }: SecurityDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVulns, setSelectedVulns] = useState<string[]>([]);

  // Mutation for security scan
  const securityScanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/security/scan`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to perform security scan');
      }
      return res.json();
    },
  });

  // Mutation for auto-fix
  const securityFixMutation = useMutation({
    mutationFn: async (applyFixes: boolean) => {
      const scanResult = securityScanMutation.data?.data?.scanResult;
      if (!scanResult?.vulnerabilities) {
        throw new Error('No vulnerabilities to fix');
      }

      const res = await fetch(`/api/projects/${projectId}/security/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vulnerabilities: scanResult.vulnerabilities,
          applyFixes,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate fixes');
      }
      return res.json();
    },
  });

  const scanResult = securityScanMutation.data?.data?.scanResult;
  const dependencyVulns = securityScanMutation.data?.data?.dependencyVulnerabilities;
  const fixResult = securityFixMutation.data?.data?.fixResult;

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Security
          </h2>
          <p className="text-sm text-muted-foreground">
            Scan for vulnerabilities and security issues
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => securityScanMutation.mutate()}
            disabled={securityScanMutation.isPending}
            className="gap-2"
          >
            {securityScanMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Run Security Scan
              </>
            )}
          </Button>
          {scanResult && scanResult.vulnerabilities.length > 0 && (
            <Button
              onClick={() => securityFixMutation.mutate(true)}
              disabled={securityFixMutation.isPending}
              variant="outline"
              className="gap-2"
            >
              {securityFixMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4" />
                  Auto-Fix Issues
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Security Score Card */}
      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle>Security Score</CardTitle>
            <CardDescription>
              Overall security posture of your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      className="text-muted stroke-current"
                      strokeWidth="10"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                    />
                    <circle
                      className={`${
                        scanResult.securityScore >= 80
                          ? 'text-green-500'
                          : scanResult.securityScore >= 60
                          ? 'text-yellow-500'
                          : scanResult.securityScore >= 40
                          ? 'text-orange-500'
                          : 'text-red-500'
                      } stroke-current`}
                      strokeWidth="10"
                      strokeLinecap="round"
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      strokeDasharray={`${scanResult.securityScore * 2.51}, 251`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">
                      {scanResult.securityScore}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                </div>
                <div>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(
                      scanResult.riskLevel
                    )}`}
                  >
                    {scanResult.riskLevel === 'critical' && (
                      <ShieldAlert className="h-4 w-4" />
                    )}
                    {scanResult.riskLevel === 'high' && (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {scanResult.riskLevel === 'medium' && (
                      <Shield className="h-4 w-4" />
                    )}
                    {scanResult.riskLevel === 'low' && (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {scanResult.riskLevel.toUpperCase()} RISK
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="secrets">Secrets</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {scanResult ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Vulnerabilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {scanResult.summary.totalVulnerabilities}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Critical Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-red-500">
                        {scanResult.summary.criticalCount}
                      </div>
                      {scanResult.summary.criticalCount === 0 && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Secrets Found
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-2xl font-bold ${
                          scanResult.summary.secretsFound > 0
                            ? 'text-red-500'
                            : 'text-green-500'
                        }`}
                      >
                        {scanResult.summary.secretsFound}
                      </div>
                      {scanResult.summary.secretsFound === 0 && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      High Severity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                      {scanResult.summary.highCount}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Severity Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Severity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-red-500" />
                        <span>Critical</span>
                      </div>
                      <span className="font-bold">
                        {scanResult.summary.criticalCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span>High</span>
                      </div>
                      <span className="font-bold">
                        {scanResult.summary.highCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>Medium</span>
                      </div>
                      <span className="font-bold">
                        {scanResult.summary.mediumCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        <span>Low</span>
                      </div>
                      <span className="font-bold">
                        {scanResult.summary.lowCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {scanResult.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {scanResult.recommendations.map((rec: any, idx: number) => (
                        <li key={idx} className="flex gap-2">
                          <span
                            className={`shrink-0 mt-1 ${
                              rec.priority === 'critical'
                                ? 'text-red-500'
                                : rec.priority === 'high'
                                ? 'text-orange-500'
                                : rec.priority === 'medium'
                                ? 'text-yellow-500'
                                : 'text-blue-500'
                            }`}
                          >
                            {idx + 1}.
                          </span>
                          <div>
                            <p className="font-medium">{rec.action}</p>
                            <p className="text-sm text-muted-foreground">
                              {rec.reason}
                            </p>
                            <p className="text-sm text-muted-foreground italic">
                              Impact: {rec.impact}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Security Scan Yet
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Run a security scan to identify vulnerabilities and security issues
                </p>
                <Button
                  onClick={() => securityScanMutation.mutate()}
                  disabled={securityScanMutation.isPending}
                >
                  Run Security Scan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vulnerabilities Tab */}
        <TabsContent value="vulnerabilities" className="space-y-4">
          {scanResult && scanResult.vulnerabilities.length > 0 ? (
            <div className="space-y-4">
              {scanResult.vulnerabilities.map((vuln: any, idx: number) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(vuln.severity)}
                        <div className="flex-1">
                          <CardTitle className="text-base">{vuln.title}</CardTitle>
                          <CardDescription>
                            {vuln.file}:{vuln.line}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            vuln.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : vuln.severity === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : vuln.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {vuln.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {vuln.owasp}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Type:</p>
                      <p className="text-sm text-muted-foreground">{vuln.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Description:</p>
                      <p className="text-sm text-muted-foreground">
                        {vuln.description}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">
                        Exploitation Scenario:
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {vuln.exploitation}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Remediation:</p>
                      <p className="text-sm text-muted-foreground">
                        {vuln.remediation}
                      </p>
                    </div>
                    {vuln.codeExample && (
                      <div>
                        <p className="text-sm font-medium mb-1">Fix Example:</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {vuln.codeExample}
                        </pre>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      CWE: {vuln.cwe}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShieldCheck className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Vulnerabilities Found
                </h3>
                <p className="text-sm text-muted-foreground">
                  {scanResult
                    ? 'Your code appears secure!'
                    : 'Run a security scan to check for vulnerabilities'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Secrets Tab */}
        <TabsContent value="secrets" className="space-y-4">
          {scanResult && scanResult.secrets.length > 0 ? (
            <div className="space-y-4">
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Critical: Hardcoded Secrets Detected
                  </CardTitle>
                  <CardDescription>
                    Remove these secrets immediately and rotate credentials
                  </CardDescription>
                </CardHeader>
              </Card>

              {scanResult.secrets.map((secret: any, idx: number) => (
                <Card key={idx} className="border-red-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <Key className="h-5 w-5 text-red-500 mt-0.5" />
                        <div>
                          <CardTitle className="text-base">{secret.type}</CardTitle>
                          <CardDescription>
                            {secret.file}:{secret.line}
                          </CardDescription>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
                        {secret.severity.toUpperCase()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {secret.description}
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-sm font-medium mb-2">Required Actions:</p>
                      <ol className="text-sm space-y-1 list-decimal list-inside">
                        <li>Remove the hardcoded secret from the code</li>
                        <li>Rotate/regenerate the compromised credential</li>
                        <li>Use environment variables or secret management</li>
                        <li>Scan git history for the secret</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lock className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Secrets Found</h3>
                <p className="text-sm text-muted-foreground">
                  {scanResult
                    ? 'No hardcoded secrets detected in your code'
                    : 'Run a security scan to check for secrets'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dependencies Tab */}
        <TabsContent value="dependencies" className="space-y-4">
          {dependencyVulns && dependencyVulns.vulnerabilities.length > 0 ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vulnerable Dependencies</CardTitle>
                  <CardDescription>
                    {dependencyVulns.summary.total} vulnerable package(s) found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-sm font-medium">
                      <span>Critical: {dependencyVulns.summary.critical}</span>
                      <span>High: {dependencyVulns.summary.high}</span>
                      <span>Medium: {dependencyVulns.summary.medium}</span>
                      <span>Low: {dependencyVulns.summary.low}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {dependencyVulns.vulnerabilities.map((vuln: any, idx: number) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {vuln.package}@{vuln.version}
                        </CardTitle>
                        <CardDescription>{vuln.cve}</CardDescription>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          vuln.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : vuln.severity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : vuln.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {vuln.severity.toUpperCase()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {vuln.description}
                    </p>
                    {vuln.patchedVersion && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-sm">
                          <span className="font-medium">Fix:</span> Upgrade to{' '}
                          {vuln.patchedVersion}
                        </p>
                        <code className="text-xs">
                          npm install {vuln.package}@{vuln.patchedVersion}
                        </code>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShieldCheck className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Vulnerable Dependencies
                </h3>
                <p className="text-sm text-muted-foreground">
                  {dependencyVulns
                    ? 'All dependencies are up to date and secure'
                    : 'Run a security scan to check dependencies'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Fix Result */}
      {fixResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Security Fixes Generated
            </CardTitle>
            <CardDescription>
              {fixResult.summary.totalFixed} fix(es) generated successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">
              Fixes have been applied to your project files. Review the changes and test
              thoroughly.
            </p>
            {fixResult.summary.requiresManualReview.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium mb-1">Manual Review Required:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {fixResult.summary.requiresManualReview.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
