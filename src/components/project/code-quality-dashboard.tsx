'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Play,
  FileCode,
  BarChart3,
} from 'lucide-react';

interface CodeQualityDashboardProps {
  projectId: string;
}

export function CodeQualityDashboard({ projectId }: CodeQualityDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Mutation for running code quality analysis
  const analyzeQualityMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/analyze/quality`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to analyze code quality');
      }
      return res.json();
    },
  });

  // Mutation for generating tests
  const generateTestsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/generate/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testingFramework: 'auto' }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate tests');
      }
      return res.json();
    },
  });

  const analysis = analyzeQualityMutation.data?.data?.analysis;
  const testResult = generateTestsMutation.data?.data?.result;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Code Quality</h2>
          <p className="text-sm text-muted-foreground">
            Analyze and improve your code quality
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => analyzeQualityMutation.mutate()}
            disabled={analyzeQualityMutation.isPending}
            className="gap-2"
          >
            {analyzeQualityMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Analyze Quality
              </>
            )}
          </Button>
          <Button
            onClick={() => generateTestsMutation.mutate()}
            disabled={generateTestsMutation.isPending}
            variant="outline"
            className="gap-2"
          >
            {generateTestsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileCode className="h-4 w-4" />
                Generate Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quality Score Card */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Quality Score</CardTitle>
            <CardDescription>
              Based on code analysis and best practices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
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
                      analysis.overallScore >= 90
                        ? 'text-green-500'
                        : analysis.overallScore >= 75
                        ? 'text-blue-500'
                        : analysis.overallScore >= 60
                        ? 'text-yellow-500'
                        : 'text-red-500'
                    } stroke-current`}
                    strokeWidth="10"
                    strokeLinecap="round"
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    strokeDasharray={`${analysis.overallScore * 2.51}, 251`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">
                    {analysis.overallScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {analysis ? (
            <>
              {/* Metrics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analysis.metrics.totalIssues}
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
                        {analysis.metrics.criticalIssues}
                      </div>
                      {analysis.metrics.criticalIssues === 0 && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Maintainability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analysis.metrics.maintainabilityIndex}
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg Complexity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analysis.metrics.averageComplexity.toFixed(1)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Issues Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Issues Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span>Critical</span>
                      </div>
                      <span className="font-bold">
                        {analysis.metrics.criticalIssues}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span>High</span>
                      </div>
                      <span className="font-bold">
                        {analysis.metrics.highIssues}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span>Medium</span>
                      </div>
                      <span className="font-bold">
                        {analysis.metrics.mediumIssues}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        <span>Low</span>
                      </div>
                      <span className="font-bold">
                        {analysis.metrics.lowIssues}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec: any, idx: number) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-muted-foreground">
                            {idx + 1}.
                          </span>
                          <div>
                            <p className="font-medium">{rec.action}</p>
                            <p className="text-sm text-muted-foreground">
                              {rec.reason}
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
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Analysis Yet
                </h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Run code quality analysis to see metrics and recommendations
                </p>
                <Button
                  onClick={() => analyzeQualityMutation.mutate()}
                  disabled={analyzeQualityMutation.isPending}
                >
                  Run Analysis
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          {analysis && analysis.issues.length > 0 ? (
            <div className="space-y-4">
              {analysis.issues.map((issue: any, idx: number) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {issue.severity === 'critical' && (
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        {issue.severity === 'high' && (
                          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                        )}
                        {issue.severity === 'medium' && (
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        )}
                        {issue.severity === 'low' && (
                          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                        )}
                        <div>
                          <CardTitle className="text-base">
                            {issue.message}
                          </CardTitle>
                          <CardDescription>
                            {issue.file}:{issue.line}
                          </CardDescription>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          issue.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : issue.severity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : issue.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {issue.severity}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Explanation:</p>
                      <p className="text-sm text-muted-foreground">
                        {issue.explanation}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Suggestion:</p>
                      <p className="text-sm text-muted-foreground">
                        {issue.suggestion}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Issues Found
                </h3>
                <p className="text-sm text-muted-foreground">
                  {analysis
                    ? 'Your code looks great!'
                    : 'Run analysis to check for issues'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests" className="space-y-4">
          {testResult ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Test Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Test Files
                      </p>
                      <p className="text-2xl font-bold">
                        {testResult.summary.totalTestFiles}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Tests
                      </p>
                      <p className="text-2xl font-bold">
                        {testResult.summary.totalTests}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Est. Coverage
                      </p>
                      <p className="text-2xl font-bold">
                        {testResult.summary.estimatedCoverage}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {testResult.testFiles.map((testFile: any, idx: number) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-base">{testFile.path}</CardTitle>
                    <CardDescription>
                      Source: {testFile.sourceFile}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Framework:</span>
                      <span className="font-medium">{testFile.framework}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Test Count:</span>
                      <span className="font-medium">{testFile.testCount}</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Coverage:</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Functions:</span>
                          <span>{testFile.coverage.functions}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Statements:</span>
                          <span>{testFile.coverage.statements}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Branches:</span>
                          <span>{testFile.coverage.branches}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tests Generated</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Generate automated tests for your project
                </p>
                <Button
                  onClick={() => generateTestsMutation.mutate()}
                  disabled={generateTestsMutation.isPending}
                >
                  Generate Tests
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
