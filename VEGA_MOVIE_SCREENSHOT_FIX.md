# /v Page Screenshot Loading Fix

## Issue
Screenshots on the `/v` page (movie detail page) were not loading correctly. Similar to the home page issue, base64 placeholders were being displayed instead of actual screenshot images.

## Root Cause
The `/app/api/vega-movie/route.ts` scraper was checking `src` attribute BEFORE `data-src`, so it extracted base64 placeholders from lazy-loaded images instead of the real URLs.

**HTML Example:**
```html
<!-- Lazy-loaded screenshot -->
<img src="data:image/gif;base64,R0lGODlh..."  ← Base64 placeholder
     data-src="https://i.imgbb.top/screenshot123.jpg"  ← Real screenshot URL
     srcset="https://i.imgbb.top/screenshot123.jpg 800w, ..."
     alt="Screenshot"/>
```

## Solution
Updated three locations in `/app/api/vega-movie/route.ts` to check `data-src` FIRST:

### 1. Poster Extraction (Lines 117-136)
**Before:**
```typescript
poster = posterEl.attr("src") || ""
```

**After:**
```typescript
let posterSrc = posterEl.attr("data-src") || posterEl.attr("src") || ""

// If image is empty or is a base64 placeholder, try srcset
if (!posterSrc || posterSrc.startsWith("data:image")) {
  const srcset = posterEl.attr("srcset") || ""
  if (srcset) {
    const firstUrl = srcset.split(",")[0].trim().split(" ")[0]
    if (firstUrl && !firstUrl.startsWith("data:")) {
      posterSrc = firstUrl
    }
  }
}
```

### 2. Screenshot Collection from DOM (Lines 205-235)
**Before:**
```typescript
const src = $(el).attr("src") || $(el).attr("data-src")
```

**After:**
```typescript
// Check data-src first (lazy loading), then src, then srcset
let src = $(el).attr("data-src") || $(el).attr("src") || ""

// If image is empty or is a base64 placeholder, try srcset
if (!src || src.startsWith("data:image")) {
  const srcset = $(el).attr("srcset") || ""
  if (srcset) {
    const firstUrl = srcset.split(",")[0].trim().split(" ")[0]
    if (firstUrl && !firstUrl.startsWith("data:")) {
      src = firstUrl
    }
  }
}
```

**Also added base64 check:**
```typescript
if (src && src !== poster && !src.startsWith("data:image")) {
  // Process image...
}
```

### 3. Synopsis Section Images (Lines 237-263)
**Before:**
```typescript
const srcMatch = imgTag.match(/src=["']([^"']+)["']/i)
if (srcMatch && srcMatch[1]) {
  cleanSrc = srcMatch[1]
}
```

**After:**
```typescript
// Check data-src first, then src, then srcset
const dataSrcMatch = imgTag.match(/data-src=["']([^"']+)["']/i)
const srcMatch = imgTag.match(/src=["']([^"']+)["']/i)
const srcsetMatch = imgTag.match(/srcset=["']([^"']+)["']/i)

let cleanSrc = ""

if (dataSrcMatch && dataSrcMatch[1] && !dataSrcMatch[1].startsWith("data:image")) {
  cleanSrc = dataSrcMatch[1]
} else if (srcMatch && srcMatch[1] && !srcMatch[1].startsWith("data:image")) {
  cleanSrc = srcMatch[1]
} else if (srcsetMatch && srcsetMatch[1]) {
  const firstUrl = srcsetMatch[1].split(",")[0].trim().split(" ")[0]
  if (firstUrl && !firstUrl.startsWith("data:")) {
    cleanSrc = firstUrl
  }
}
```

## Image Extraction Priority
All three locations now follow this priority:
1. **`data-src`** - Real URL for lazy-loaded images
2. **`src`** - May be real or placeholder
3. **`srcset`** - Fallback for responsive images
4. **Skip base64** - Ignore any `data:image/...` placeholders

## Result
✅ Movie posters load correctly on `/v` page
✅ Screenshots display properly (not base64 placeholders)
✅ Both blogger.googleusercontent.com and imgbb.top screenshots work
✅ Lazy-loaded images are handled correctly

## Complete Fix Summary

### Total Files Fixed: 4

#### Home Page Scrapers (3 files):
1. `/app/api/category/latest/route.ts` - Latest movies
2. `/app/api/category/[category]/route.ts` - Category pages
3. `/app/api/scrape/route.ts` - Main scraper

#### Movie Detail Page (1 file):
4. `/app/api/vega-movie/route.ts` - Movie details & screenshots

### What's Fixed:
- ✅ Home page images load
- ✅ Category page images load
- ✅ Search results images load (already worked)
- ✅ `/v` page movie posters load
- ✅ `/v` page screenshots load
- ✅ All lazy-loaded images handled correctly

## Technical Notes
- VegaMovies-NL uses WordPress lazy loading plugin
- Lazy loading sets `src="data:image/..."` as placeholder
- Real image URL is stored in `data-src` attribute
- Responsive images may also use `srcset`
- Our scrapers now extract from the correct attributes
- Base64 placeholders are explicitly filtered out
