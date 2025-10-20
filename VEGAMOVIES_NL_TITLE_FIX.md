# Vegamovies-NL Title Extraction Fix

## Issue
The /v page (movie detail page) was failing to scrape movie titles from vegamovies-nl due to their new HTML structure in 2025.

## Root Cause
The title extraction logic in the movie detail APIs was looking for `h1.entry-title` selector, but vegamovies-nl's new design uses `h1.page-title` instead.

### Old HTML Structure (before 2025):
```html
<h1 class="entry-title">Movie Title</h1>
```

### New HTML Structure (2025):
```html
<h1 class="page-title" itemprop="headline">Kunwara (2000) Hindi Full Movie JC WebRip 480p [350MB] | 720p [1.5GB] | 1080p [3.5GB]</h1>
```

## Solution
Updated title extraction selectors in both movie detail API routes to support multiple title formats with priority order.

## Files Modified

### 1. `/workspace/app/api/vega-movie/route.ts` (Line 111-115)
**Before:**
```typescript
const title = $("h1.entry-title, .entry-title").first().text().trim() || "Unknown Title"
```

**After:**
```typescript
// Support multiple title selectors for different website designs:
// - h1.page-title: vegamovies-nl new design (2025)
// - h1.entry-title: vegamovies old design and other vega sites
// - .entry-title: fallback for various templates
const title = $("h1.page-title, h1.entry-title, .entry-title").first().text().trim() || "Unknown Title"
```

### 2. `/workspace/app/api/lux-movie/route.ts` (Line 103-107)
**Before:**
```typescript
const title = $("h1.entry-title").text().trim() || "Unknown Title"
```

**After:**
```typescript
// Support multiple title selectors for different website designs:
// - h1.page-title: vegamovies-nl new design (2025)
// - h1.entry-title: vegamovies-nl old design
const title = $("h1.page-title, h1.entry-title").text().trim() || "Unknown Title"
```

## How It Works

### Priority Order
The selector `$("h1.page-title, h1.entry-title, .entry-title")` works by:
1. First trying `h1.page-title` (vegamovies-nl new design 2025)
2. If not found, trying `h1.entry-title` (old design & other vega sites)
3. If still not found, trying `.entry-title` (generic fallback)
4. If none found, returns "Unknown Title"

### Cheerio Selector Logic
```javascript
.first() // Gets the first matching element from the comma-separated selectors
.text() // Extracts the text content
.trim() // Removes whitespace
```

## Testing Results

✅ **Build successful** - No compilation errors
✅ **Backward compatible** - Old vegamovies designs still work
✅ **New design support** - vegamovies-nl 2025 titles extracted correctly
✅ **Other vega sites** - Still work as expected (vegamovise.biz, bollyhub.one)

## Example Extraction

### vegamovies-nl New Design (2025):
```html
<h1 class="page-title" itemprop="headline">
  Kunwara (2000) Hindi Full Movie JC WebRip 480p [350MB] | 720p [1.5GB] | 1080p [3.5GB]
</h1>
```
**Extracted:** "Kunwara (2000) Hindi Full Movie JC WebRip 480p [350MB] | 720p [1.5GB] | 1080p [3.5GB]"

### vegamovies Old Design:
```html
<h1 class="entry-title">Movie Title Here</h1>
```
**Extracted:** "Movie Title Here"

## Related Changes
This fix complements the earlier updates made to the listing pages (home, category, search) which were updated to support the new `article.entry-card` structure.

## Impact
- ✅ `/v/[...slug]` page now correctly displays titles from vegamovies-nl
- ✅ `/vega-nl/[...slug]` page also benefits from this fix
- ✅ All other vega sources remain unaffected
- ✅ No breaking changes to existing functionality

## Notes
- The fix is defensive and uses fallback selectors
- Maintains full backward compatibility
- Works across all vegamovies variants (vegamovise.biz, bollyhub.one, vegamovies-nl.run)
- Other scraping functionality (poster, IMDb, downloads, screenshots) remains unchanged
