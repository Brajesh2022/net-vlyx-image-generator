# Domain Management Feature - `/change` Page

## Overview

A secret admin page at `/change` that allows authorized users to update VegaMovies domains across the entire codebase with automatic GitHub Pull Request creation.

## Features

✅ **GitHub Token Authentication** - Secured access with GitHub Personal Access Token
✅ **Persistent Auth** - Token stored in localStorage (one-time authentication)
✅ **Domain Updates** - Update both VegaBiz and VegaNL domains
✅ **Automated PR Creation** - Creates pull requests with proper commit attribution
✅ **Multi-file Updates** - Updates 10+ files automatically
✅ **Proper Git Attribution** - Commits attributed to brajesh2022k@gmail.com

## Access

🔒 Navigate to: `https://yourdomain.com/change`

## Setup

### 1. Install Dependencies

```bash
npm install
```

The following package was added:
- `@octokit/rest@^20.0.2` - GitHub API integration

### 2. Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens/new
2. Set scopes: **`repo`** (Full control of private repositories)
3. Generate token
4. Copy the token (starts with `ghp_`)

### 3. First-time Authentication

1. Navigate to `/change`
2. Enter your GitHub token
3. Click "Authenticate"
4. Token is stored in localStorage (persists across sessions)

## Usage

### Update Domains

1. **VegaBiz Domain** - Updates `vegamovise.biz` references
   - Used in: `/v` page, scrape-vega API
   
2. **VegaNL Domain** - Updates `vegamovies-nl.autos` references
   - Used in: Home, categories, scraper, vega-nl pages

### Files Automatically Updated

The system updates domains in these files:

1. `app/v/[...slug]/page.tsx`
2. `app/api/scrape-vega/route.ts`
3. `app/vega-nl/[...slug]/page.tsx`
4. `app/view-all/page.tsx`
5. `components/category-row.tsx`
6. `app/page.tsx`
7. `app/category/page.tsx`
8. `app/api/scrape/route.ts`
9. `app/api/category/latest/route.ts`
10. `app/api/category/[category]/route.ts`

### Workflow

1. Enter new domain URLs
2. Click "Create Pull Request"
3. System automatically:
   - Creates a new branch (`update-domains-{timestamp}`)
   - Updates all domain references
   - Commits changes with proper author (Brajesh Kumar <brajesh2022k@gmail.com>)
   - Creates pull request
   - Provides link to view PR

4. Click "View Pull Request on GitHub"
5. Review changes on GitHub
6. Merge PR when ready

## Example

### Before:
```typescript
const srcHost = "https://vegamovise.biz"
const BASE_URL = "https://www.vegamovies-nl.autos/"
```

### After (if domains changed):
```typescript
const srcHost = "https://newdomain.com"
const BASE_URL = "https://www.newdomain.com/"
```

## Technical Details

### API Endpoint
- **Route:** `/api/create-domain-pr`
- **Method:** `POST`
- **Body:**
  ```json
  {
    "githubToken": "ghp_xxxx",
    "vegaBizDomain": "https://vegamovise.biz",
    "vegaNlDomain": "https://www.vegamovies-nl.autos"
  }
  ```

### Response
```json
{
  "success": true,
  "prUrl": "https://github.com/Brajesh2022/Netvlyx/pull/123",
  "branchName": "update-domains-1234567890",
  "filesUpdated": 10,
  "updatedFiles": ["app/page.tsx", ...]
}
```

### GitHub Repository
- **Owner:** Brajesh2022
- **Repo:** Netvlyx
- **URL:** https://github.com/Brajesh2022/Netvlyx

### Commit Attribution
- **Author Name:** Brajesh Kumar
- **Author Email:** brajesh2022k@gmail.com

## Security

✅ Token never sent to server logs
✅ Stored only in browser localStorage
✅ GitHub API validates token on each request
✅ Changes go through PR review (not directly to main)
✅ Only users with valid GitHub token can access

## Troubleshooting

### "Invalid GitHub token"
- Ensure token has `repo` scope
- Token may have expired - generate a new one
- Check token starts with `ghp_`

### "No files were updated"
- Domains may already be current
- Check that new domains are different from existing ones

### PR creation fails
- Ensure GitHub token has write access to repository
- Check repository exists and is accessible
- Verify branch doesn't already exist with same name

## Logout

Click the "Logout" button to:
- Clear token from localStorage
- Return to authentication screen
- Reset all form fields

## Components Created

### Pages
- `app/change/page.tsx` - Main domain management UI

### API Routes
- `app/api/create-domain-pr/route.ts` - GitHub PR creation logic

### UI Components
- `components/ui/label.tsx` - Form labels
- `components/ui/alert.tsx` - Alert messages

## Benefits

🚀 **Fast Updates** - Change domains across entire codebase in seconds
🔒 **Safe** - All changes go through PR review
📝 **Traceable** - Proper git history with commit attribution
🎯 **Accurate** - No manual find/replace errors
⚡ **Automated** - No need to manually edit 10+ files

---

**Created by:** Brajesh Kumar (brajesh2022k@gmail.com)
**Repository:** https://github.com/Brajesh2022/Netvlyx
