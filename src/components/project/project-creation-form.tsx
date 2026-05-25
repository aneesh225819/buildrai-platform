'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, FolderPlus, Database, Code2, GitBranch, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

const projectSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be less than 50 characters'),
  description: z.string().max(200).optional(),
  projectType: z.enum(['empty', 'datasource']),
  dataSource: z.enum(['github', 'bitbucket', 'azure']).optional(),
  repository: z.string().optional(),
  branch: z.string().optional(),
  template: z.string().optional(),
  language: z.enum(['typescript', 'javascript', 'python']).optional(),
  framework: z.string().optional(),
  packageManager: z.enum(['npm', 'yarn', 'pnpm']).optional(),
  styling: z.string().optional(),
}).refine(
  (data) => {
    // If empty project, template, framework, language, package manager, and styling are required
    if (data.projectType === 'empty') {
      return (
        data.template && data.template.length > 0 &&
        data.framework && data.framework.length > 0 &&
        data.language &&
        data.packageManager &&
        data.styling && data.styling.length > 0
      );
    }
    // If data source project, dataSource, repository, and branch are required
    if (data.projectType === 'datasource') {
      return (
        data.dataSource && data.dataSource.length > 0 &&
        data.repository && data.repository.length > 0 &&
        data.branch && data.branch.length > 0
      );
    }
    return true;
  },
  {
    message: 'Please complete all required fields',
    path: ['template'],
  }
);

type ProjectFormValues = z.infer<typeof projectSchema>;

const templates = [
  { value: 'nextjs', label: 'Next.js', frameworks: ['nextjs'] },
  { value: 'react', label: 'React', frameworks: ['vite', 'cra'] },
  { value: 'nodejs', label: 'Node.js', frameworks: ['express', 'fastify', 'nestjs'] },
  { value: 'python', label: 'Python', frameworks: ['flask', 'django', 'fastapi'] },
];

export function ProjectCreationForm() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [projectType, setProjectType] = useState<'empty' | 'datasource'>('empty');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [repositories, setRepositories] = useState<{ value: string; label: string; owner?: string }[]>([]);
  const [branches, setBranches] = useState<{ value: string; label: string }[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');

  // Check if user just connected via OAuth
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const provider = searchParams.get('provider');
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      // TODO: Show error toast to user
      return;
    }

    if (provider && connected === 'true') {
      // User just connected, set the data source and fetch repositories
      form.setValue('dataSource', provider as 'github' | 'bitbucket' | 'azure');
      setProjectType('datasource');
      fetchRepositories(provider as 'github' | 'bitbucket' | 'azure');

      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/new');
    }
  }, []);

  const fetchRepositories = async (provider: 'github' | 'bitbucket' | 'azure') => {
    try {
      const response = await fetch(`/api/integrations/${provider}/repositories`);

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const data = await response.json();
      const repoOptions = data.data.map((repo: any) => ({
        value: repo.id,
        label: repo.fullName,
        owner: repo.fullName.split('/')[0], // Extract owner for GitHub/Bitbucket
      }));

      setRepositories(repoOptions);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    }
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      projectType: 'empty',
      dataSource: undefined,
      repository: undefined,
      branch: undefined,
      template: '',
      language: 'typescript',
      framework: '',
      packageManager: 'npm',
      styling: 'tailwind',
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          projectType: data.projectType,
          dataSource: data.dataSource,
          settings: {
            template: data.template,
            language: data.language,
            framework: data.framework,
            packageManager: data.packageManager,
            styling: data.styling,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create project');
      }

      return res.json();
    },
    onSuccess: (data) => {
      router.push(`/dashboard/projects/${data.data.id}`);
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  const handleConnect = async (source: 'github' | 'bitbucket' | 'azure') => {
    setIsConnecting(true);
    try {
      // Redirect to OAuth authorization endpoint
      window.location.href = `/api/integrations/${source}/authorize`;
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
    }
  };

  const handleRepositoryChange = async (repoValue: string, owner?: string) => {
    setSelectedRepo(repoValue);
    form.setValue('repository', repoValue);

    // Fetch branches for selected repository
    try {
      const dataSource = form.watch('dataSource');
      const params = new URLSearchParams({
        repository: repoValue,
      });

      // Add owner parameter for GitHub/Bitbucket
      if (owner && (dataSource === 'github' || dataSource === 'bitbucket')) {
        params.append('owner', owner);
      }

      const response = await fetch(
        `/api/integrations/${dataSource}/branches?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch branches');
      }

      const data = await response.json();
      const branchOptions = data.data.map((branch: any) => ({
        value: branch.name,
        label: branch.name,
      }));

      setBranches(branchOptions);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const selectedTemplateData = templates.find(
    (t) => t.value === selectedTemplate
  );

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5">
      <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
        <CardTitle className="text-xl font-bold">Project Configuration</CardTitle>
        <CardDescription className="text-sm font-medium">
          Set up your new project with the options below
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Type Selection */}
            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Project Type</FormLabel>
                  <FormDescription className="mb-4">
                    Choose whether to start with an empty project or connect to a data source
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-4">
                    <Card
                      className={cn(
                        'cursor-pointer transition-all border-2',
                        projectType === 'empty'
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                      onClick={() => {
                        setProjectType('empty');
                        field.onChange('empty');
                        form.setValue('dataSource', undefined);
                      }}
                    >
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/20 mb-3">
                          <FolderPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-semibold text-base mb-1">Empty Project</h3>
                        <p className="text-xs text-muted-foreground">
                          Start from scratch with a new project
                        </p>
                      </CardContent>
                    </Card>

                    <Card
                      className={cn(
                        'cursor-pointer transition-all border-2',
                        projectType === 'datasource'
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                      onClick={() => {
                        setProjectType('datasource');
                        field.onChange('datasource');
                      }}
                    >
                      <CardContent className="p-6 flex flex-col items-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/20 mb-3">
                          <Database className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-base mb-1">Data Source</h3>
                        <p className="text-xs text-muted-foreground">
                          Import from GitHub, Bitbucket, or Azure Repos
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data Source Selection - Only shown when datasource is selected */}
            {projectType === 'datasource' && (
              <>
                <FormField
                  control={form.control}
                  name="dataSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Data Source</FormLabel>
                      <FormDescription className="mb-3">
                        Choose which repository service to connect to
                      </FormDescription>
                      <div className="grid grid-cols-3 gap-3">
                        <Card
                          className={cn(
                            'cursor-pointer transition-all border-2',
                            field.value === 'github'
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          )}
                          onClick={() => {
                            field.onChange('github');
                            setIsConnected(false);
                            setRepositories([]);
                            setBranches([]);
                          }}
                        >
                          <CardContent className="p-4 flex flex-col items-center text-center">
                            <Code2 className="h-8 w-8 mb-2 text-slate-900 dark:text-white" />
                            <span className="font-semibold text-sm">GitHub</span>
                          </CardContent>
                        </Card>

                        <Card
                          className={cn(
                            'cursor-pointer transition-all border-2',
                            field.value === 'bitbucket'
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          )}
                          onClick={() => {
                            field.onChange('bitbucket');
                            setIsConnected(false);
                            setRepositories([]);
                            setBranches([]);
                          }}
                        >
                          <CardContent className="p-4 flex flex-col items-center text-center">
                            <GitBranch className="h-8 w-8 mb-2 text-blue-600 dark:text-blue-400" />
                            <span className="font-semibold text-sm">Bitbucket</span>
                          </CardContent>
                        </Card>

                        <Card
                          className={cn(
                            'cursor-pointer transition-all border-2',
                            field.value === 'azure'
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          )}
                          onClick={() => {
                            field.onChange('azure');
                            setIsConnected(false);
                            setRepositories([]);
                            setBranches([]);
                          }}
                        >
                          <CardContent className="p-4 flex flex-col items-center text-center">
                            <Cloud className="h-8 w-8 mb-2 text-blue-500 dark:text-blue-300" />
                            <span className="font-semibold text-sm">Azure Repos</span>
                          </CardContent>
                        </Card>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Connect Button */}
                {form.watch('dataSource') && !isConnected && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      onClick={() => handleConnect(form.watch('dataSource')!)}
                      disabled={isConnecting}
                      className="gap-2"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          Connect to {form.watch('dataSource') === 'github' ? 'GitHub' : form.watch('dataSource') === 'bitbucket' ? 'Bitbucket' : 'Azure Repos'}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Repository Selection */}
                {isConnected && repositories.length > 0 && (
                  <FormField
                    control={form.control}
                    name="repository"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Repository</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            if (value) {
                              field.onChange(value);
                              const repo = repositories.find(r => r.value === value);
                              handleRepositoryChange(value, repo?.owner);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a repository" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {repositories.map((repo) => (
                              <SelectItem key={repo.value} value={repo.value}>
                                {repo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the repository you want to import
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Branch Selection */}
                {selectedRepo && branches.length > 0 && (
                  <FormField
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Branch</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.value} value={branch.value}>
                                {branch.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the branch to import from
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* Project Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="my-awesome-app" {...field} />
                  </FormControl>
                  <FormDescription>
                    Choose a unique name for your project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of your project..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template - Only shown for empty projects */}
            {projectType === 'empty' && (
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Template</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value) {
                          setSelectedTemplate(value);
                        }
                        form.setValue('framework', '');
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.value} value={template.value}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose the base template for your project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Framework - Only shown for empty projects when template is selected */}
            {projectType === 'empty' && selectedTemplateData && (
              <FormField
                control={form.control}
                name="framework"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Framework</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a framework" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedTemplateData.frameworks.map((framework) => (
                          <SelectItem key={framework} value={framework}>
                            {framework.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Language - Only shown for empty projects */}
            {projectType === 'empty' && (
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Package Manager - Only shown for empty projects */}
            {projectType === 'empty' && (
              <FormField
                control={form.control}
                name="packageManager"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Manager</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="npm">npm</SelectItem>
                        <SelectItem value="yarn">Yarn</SelectItem>
                        <SelectItem value="pnpm">pnpm</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Styling - Only shown for empty projects */}
            {projectType === 'empty' && (
              <FormField
                control={form.control}
                name="styling"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Styling</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tailwind">Tailwind CSS</SelectItem>
                        <SelectItem value="css-modules">CSS Modules</SelectItem>
                        <SelectItem value="styled-components">
                          Styled Components
                        </SelectItem>
                        <SelectItem value="emotion">Emotion</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Error Message */}
            {createProjectMutation.isError && (
              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                {createProjectMutation.error.message}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={createProjectMutation.isPending}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
                className="flex-1 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
              >
                {createProjectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
