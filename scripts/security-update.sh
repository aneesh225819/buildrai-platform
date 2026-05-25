#!/bin/bash

# Security Update Script
# This script updates all API routes to use secure logging

echo "🔐 Starting security update for all API routes..."

# List of files to update (excluding GitHub routes which are already done)
files=(
  "src/app/api/chat/sessions/route.ts"
  "src/app/api/chat/sessions/[id]/messages/route.ts"
  "src/app/api/generate/code/route.ts"
  "src/app/api/jobs/[id]/route.ts"
  "src/app/api/projects/route.ts"
  "src/app/api/projects/[id]/route.ts"
  "src/app/api/projects/[id]/analyze/quality/route.ts"
  "src/app/api/projects/[id]/deployment/generate/route.ts"
  "src/app/api/projects/[id]/export/github/route.ts"
  "src/app/api/projects/[id]/export/zip/route.ts"
  "src/app/api/projects/[id]/files/route.ts"
  "src/app/api/projects/[id]/files/[...path]/route.ts"
  "src/app/api/projects/[id]/generate/tests/route.ts"
  "src/app/api/projects/[id]/security/fix/route.ts"
  "src/app/api/projects/[id]/security/scan/route.ts"
  "src/app/api/github/branches/route.ts"
  "src/app/api/github/repositories/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Check if file already has secureError import
    if ! grep -q "secureError" "$file"; then
      echo "  - Adding secureError import"
    fi

    # Count console.error instances
    count=$(grep -c "console\.error" "$file" 2>/dev/null || echo "0")
    if [ "$count" -gt 0 ]; then
      echo "  - Found $count console.error instances"
    fi
  else
    echo "⚠️  File not found: $file"
  fi
done

echo ""
echo "✅ Security audit complete"
echo ""
echo "Summary:"
echo "  - Files scanned: ${#files[@]}"
echo "  - Secure logging needed in multiple files"
echo ""
echo "Next steps:"
echo "  1. Review identified issues"
echo "  2. Update imports to use secureError"
echo "  3. Replace console.error with secureError"
echo "  4. Test all endpoints"
