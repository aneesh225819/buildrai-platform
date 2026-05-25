# Features To Implement

## Current Status
✅ **Code Generation** - Working! AI generates actual files
✅ **Request Queue** - Can queue multiple generation requests
✅ **Authentication** - Clerk integration working
✅ **Database** - MongoDB storing projects and files

## Pending Features

### 1. File Management (High Priority)
**Location**: Project workspace file explorer

**Features Needed**:
- [ ] Checkbox selection for files
- [ ] Multi-select with Ctrl/Cmd+Click
- [ ] Delete selected files (with confirmation)
- [ ] Rename file dialog
- [ ] Batch delete multiple files
- [ ] File context menu (right-click)

**API Routes to Create**:
- `DELETE /api/projects/[id]/files` - Delete files
- `PATCH /api/projects/[id]/files` - Rename file

**Components to Update**:
- `src/components/project/file-explorer.tsx` - Add checkboxes and actions

---

### 2. Project Management (High Priority)
**Location**: Project workspace header

**Features Needed**:
- [ ] Edit Project button → Opens dialog
- [ ] Rename project
- [ ] Update project settings (framework, language, etc.)
- [ ] Delete project (with confirmation)
- [ ] Archive project

**API Routes to Update**:
- `PATCH /api/projects/[id]` - Update project details
- `DELETE /api/projects/[id]` - Delete project

**Components to Create**:
- `src/components/project/project-settings-dialog.tsx` - Edit project
- `src/components/project/delete-project-dialog.tsx` - Confirm deletion

---

### 3. Navigation (Medium Priority)
**Location**: All pages

**Features Needed**:
- [ ] Breadcrumb navigation (Home > Projects > Project Name)
- [ ] Back button in project workspace
- [ ] Logo/Home link in header
- [ ] Sidebar navigation (optional)

**Components to Create/Update**:
- `src/components/layout/breadcrumbs.tsx` - Breadcrumb component
- Update `project-workspace.tsx` - Add back button

---

## Implementation Order

### Phase 1: File Management (Most Critical)
1. Create file management API routes
2. Update FileExplorer with checkboxes
3. Add file action toolbar (Delete, Rename buttons)
4. Add confirmation dialogs

### Phase 2: Project Management
1. Create project update/delete API routes
2. Create Project Settings dialog
3. Hook up Settings button in workspace header
4. Add delete project option

### Phase 3: Navigation
1. Create breadcrumb component
2. Add to all pages
3. Add back button to workspace

---

## Quick Wins (Can implement now)

### 1. Add Back Button to Workspace
**File**: `src/components/project/project-workspace.tsx`
**Change**: Add ArrowLeft icon button linking to `/dashboard`

```tsx
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// In header:
<Link href="/dashboard">
  <Button variant="ghost" size="sm" className="gap-2">
    <ArrowLeft className="h-4 w-4" />
    Back
  </Button>
</Link>
```

### 2. Make Settings Button Functional
**File**: `src/components/project/project-workspace.tsx`
**Change**: Create a dialog for project settings

---

## Notes
- File management is most urgent for user productivity
- Project management enables full CRUD operations
- Navigation improves UX but is less critical
- All features should have loading states and error handling
- Use confirmation dialogs for destructive actions

## Current Blockers
- Need to implement these features but context is getting large
- Server memory issues with Turbopack (may need periodic restarts)
- Should prioritize which features to implement first
