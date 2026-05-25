'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Folder, Clock, FileCode, ArrowRight, Plus } from 'lucide-react';

export function ProjectList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-3/4 bg-muted rounded"></div>
              <div className="h-4 w-1/2 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive">
            Error loading projects. Please try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const projects = data?.data?.projects || [];

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Folder className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Get started by creating your first project
          </p>
          <Link href="/dashboard/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Project
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project: any) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectCard({ project }: { project: any }) {
  return (
    <Link href={`/dashboard/projects/${project.id}`} className="block group">
      <Card className="h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader className="relative pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors duration-200">
                {project.name}
              </CardTitle>
              <CardDescription className="mt-2 flex items-center gap-2 text-sm font-medium">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {project.settings.framework}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 dark:text-slate-400">{project.settings.language}</span>
              </CardDescription>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ring-2 ring-offset-2 ${
                project.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800'
                  : project.status === 'draft'
                    ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800'
                    : 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
              }`}
            >
              {project.status}
            </span>
          </div>
        </CardHeader>

        <CardContent className="relative">
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed">
            {project.description || 'No description provided'}
          </p>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <FileCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium">{project.stats.totalFiles} files</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="font-medium">
                {formatDistanceToNow(new Date(project.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="relative border-t bg-slate-50/50 dark:bg-slate-800/50">
          <Button variant="ghost" className="w-full justify-between group/btn text-sm font-semibold hover:bg-primary/10 hover:text-primary">
            <span>Open Project</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-2 duration-200" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
