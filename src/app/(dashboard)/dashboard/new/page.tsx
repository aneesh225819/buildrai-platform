// Authentication disabled for testing
// import { auth } from '@clerk/nextjs/server';
// import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { ProjectCreationForm } from '@/components/project/project-creation-form';

export default async function NewProjectPage() {
  // const { userId } = await auth();

  // if (!userId) {
  //   redirect('/sign-in');
  // }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Enhanced Header */}
      <header className="border-b bg-white/50 backdrop-blur-xl dark:bg-slate-900/50 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="font-medium">Back</span>
                </Button>
              </Link>
              <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent dark:via-slate-700" />
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-sm">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Create New Project
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Set up your project configuration
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with better spacing */}
      <main className="flex-1 py-12">
        <div className="container mx-auto max-w-3xl px-6">
          <ProjectCreationForm />
        </div>
      </main>
    </div>
  );
}
