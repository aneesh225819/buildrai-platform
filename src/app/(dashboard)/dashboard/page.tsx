// Authentication disabled for testing
// import { auth } from '@clerk/nextjs/server';
// import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProjectList } from '@/components/dashboard/project-list';
// import { ThemeToggle } from '@/components/ui/theme-toggle';

export default async function DashboardPage() {
  // const { userId } = await auth();
  // if (!userId) {
  //   redirect('/sign-in');
  // }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header with enhanced design */}
      <header className="border-b bg-white/50 backdrop-blur-xl dark:bg-slate-900/50 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Projects
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                Manage and organize your development projects
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* <ThemeToggle /> */}
              <Link href="/dashboard/new">
                <Button className="gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with better spacing */}
      <main className="flex-1 py-12">
        <div className="container mx-auto px-6">
          <ProjectList />
        </div>
      </main>
    </div>
  );
}
