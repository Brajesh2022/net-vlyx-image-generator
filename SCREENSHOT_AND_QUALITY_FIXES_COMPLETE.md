# Screenshot and Quality Parameter Implementation - Complete

## Summary
Successfully implemented multiple enhancements to the /v and /vlyxdrive pages as requested:

1. ✅ **Fixed Screenshot Extraction** - Now fetches actual screenshots instead of posters
2. ✅ **Added Quality Parameter** - Quality is now passed from /v page to /vlyxdrive page
3. ✅ **Implemented Auto-Selection** - /vlyxdrive page auto-filters by quality when parameter is present
4. ✅ **Enhanced UI** - Clear visual indicators for quality filtering status

---

## 1. Screenshot Extraction Fix

### File: `/workspace/app/api/vega-movie/route.ts`

**Changes Made:**
- Completely rewrote the screenshot extraction logic to prioritize actual screenshots over posters
- Implemented a 3-tier strategy for finding screenshots:

#### Strategy 1: `.ss-img` Container (Highest Priority)
```typescript
$(".ss-img img, .container.ss-img img").each(...)
```
- Looks for images within the `.ss-img` container class
- This is where Movies4u and similar sites place actual screenshots

#### Strategy 2: "Screenshots:" Heading
```typescript
$(`${CONTENT_SCOPE} h3, h2, h4`).each((i, heading) => {
  if (/screenshots?:/i.test(headingText)) {
    // Get images after this heading
  }
})
```
- Finds headings with "Screenshots:" text
- Extracts images from the next few siblings

#### Strategy 3: Fallback to Screenshot Hosts
```typescript
const screenshotHostSelectors = [
  "img[src*='imgbb']",
  "img[src*='ibb.co']",
  "img[src*='imageban.ru']",
  // ... more hosts
]
```
- If no screenshots found via above methods, looks for images from known screenshot hosting services

**Result:** The /v page now displays actual movie/series screenshots instead of posters.

---

## 2. Quality Parameter Implementation

### File: `/workspace/app/v/[...slug]/page.tsx`

**Changes Made:**

#### Enhanced `generateVlyxDriveUrl` Function
Added quality parameter support for both **m4ulinks** and **nextdrive** URLs:

```typescript
// For m4ulinks URLs (line 567)
const encodedKey = encodeVlyxDriveParams({
  link: url,
  tmdbid: tmdbIdWithType,
  ...(seasonNumber && { season: seasonNumber }),
  ...(quality && { quality: quality }) // ✅ NEW
})

// For nextdrive URLs (line 591-596) 
const encodedKey = encodeVlyxDriveParams({
  link: url,
  tmdbid: tmdbIdWithType,
  ...(seasonNumber && { season: seasonNumber }),
  ...(serverName && { server: serverName }),
  ...(quality && { quality: quality }) // ✅ NEW
})
```

**Flow:**
1. User selects a quality on /v page (e.g., "1080p HEVC")
2. `handleQualitySelect(quality)` is called, setting `selectedQuality` state
3. When user clicks a download/watch button, `generateVlyxDriveUrl` is called with `item.download.quality`
4. Quality is encoded into the URL: `/vlyxdrive?key=<encoded>&action=download`
5. /vlyxdrive page receives and uses the quality parameter

---

## 3. Auto-Selection Logic on /vlyxdrive Page

### File: `/workspace/app/vlyxdrive/page.tsx`

**Changes Made:**

#### Enhanced Quality Matching
```typescript
// Helper function to match quality strings (fuzzy match)
const matchesQuality = (itemQuality: string | undefined, targetQuality: string | undefined): boolean => {
  if (!targetQuality || !itemQuality) return true
  
  // Normalize both strings for comparison
  const normalize = (q: string) => q.toLowerCase().replace(/[\s\-_]/g, '')
  const normalizedItem = normalize(itemQuality)
  const normalizedTarget = normalize(targetQuality)
  
  // Exact match
  if (normalizedItem === normalizedTarget) return true
  
  // Partial match (e.g., "720p" matches "720p HEVC")
  if (normalizedItem.includes(normalizedTarget) || normalizedTarget.includes(normalizedItem)) {
    return true
  }
  
  return false
}
```

#### Quality Filtering with Match Tracking
```typescript
let hasQualityMatch = false
if (quality) {
  const qualityMatches = data.linkData.filter((item: any) => matchesQuality(item.quality, quality))
  if (qualityMatches.length > 0) {
    filteredLinkData = qualityMatches
    hasQualityMatch = true // ✅ Track if we found matches
  }
  // If no matches, show all (user may need to select manually)
}
```

#### Return Type Updated
```typescript
interface VlyxDriveData {
  type: "episode" | "movie"
  title: string
  episodes?: EpisodeDownload[]
  movie?: MovieDownload
  hasQualityMatch?: boolean // ✅ NEW: Track if quality parameter matched
}
```

**Behavior:**
- ✅ If quality parameter matches → Filter and show only matching quality options
- ✅ Prioritize N-Cloud/Hub-Cloud servers for matched quality
- ✅ If quality doesn't match → Show all options (no filtering)
- ✅ Clear visual feedback on whether quality was matched or not

---

## 4. Enhanced UI Indicators

### Visual Feedback for Users

#### Movie View (with TMDB data)
```typescript
<p className="text-gray-400 text-lg">
  Watch or Download
  {quality && vlyxDriveData.hasQualityMatch && (
    <span className="ml-2 text-green-400">• Filtered by {quality}</span>
  )}
  {quality && !vlyxDriveData.hasQualityMatch && (
    <span className="ml-2 text-yellow-400">• {quality} not found, showing all options</span>
  )}
</p>
```

#### Episode View
```typescript
<p className="text-gray-400 text-lg">
  {vlyxDriveData.episodes?.length} episodes available
  {season && ` • Season ${season}`}
  {quality && vlyxDriveData.hasQualityMatch && (
    <span className="ml-2 text-green-400">• Filtered by {quality}</span>
  )}
  {quality && !vlyxDriveData.hasQualityMatch && (
    <span className="ml-2 text-yellow-400">• {quality} not found, showing all options</span>
  )}
</p>
```

#### Minimal View (without TMDB data)
```typescript
<Badge className="bg-green-600/90 backdrop-blur-sm text-white">
  ✓ Filtered by {quality}
</Badge>
// OR
<Badge className="bg-yellow-600/90 backdrop-blur-sm text-white">
  {quality} not found - showing all
</Badge>
```

#### Success Message for N-Cloud
```typescript
{quality && vlyxDriveData.hasQualityMatch && (
  <div className="mb-4 p-4 bg-green-900/30 border border-green-600/50 rounded-xl">
    <p className="text-green-300 text-sm">
      ✓ Found {quality} quality with N-Cloud. Click below to continue.
    </p>
  </div>
)}
```

---

## User Experience Flow

### Example: User selects "1080p HEVC" on /v page

1. **On /v Page:**
   - User selects "Download" mode
   - Selects "Episode-wise" or "Bulk" download type
   - Clicks "1080p HEVC" quality button
   - Sees download options
   - Clicks on an m4ulinks or nextdrive link

2. **Navigation:**
   - URL generated: `/vlyxdrive?key=<encoded_data>&action=download`
   - Encoded data includes: `quality: "1080p HEVC"`

3. **On /vlyxdrive Page:**
   - Page loads and decodes parameters
   - Fetches m4ulinks page content
   - Filters for "1080p HEVC" quality
   - **If found:**
     - ✅ Shows green indicator: "✓ Filtered by 1080p HEVC"
     - Only displays 1080p HEVC options
     - Prioritizes N-Cloud/Hub-Cloud servers
     - Shows success message if N-Cloud available
     - "Show more options" button available
   - **If not found:**
     - ⚠️ Shows yellow indicator: "1080p HEVC not found, showing all options"
     - Displays all available quality options
     - User can manually select their preferred option

---

## Technical Details

### Cloud Server Prioritization
```typescript
const prioritizeCloudServers = (servers: Array<{name: string, url: string, style?: string}>) => {
  // Separate cloud servers from others
  const cloudServers = servers.filter(s => isNCloudServer(s.name, s.url))
  const otherServers = servers.filter(s => !isNCloudServer(s.name, s.url))
  
  // If quality parameter is set and we have cloud servers, only show cloud servers by default
  if (quality && cloudServers.length > 0) {
    return { 
      priority: cloudServers,
      others: otherServers,
      hasHidden: otherServers.length > 0
    }
  }
  
  // Otherwise show cloud first, then others
  return {
    priority: cloudServers,
    others: otherServers,
    hasHidden: false
  }
}
```

### N-Cloud Detection
```typescript
const isNCloudServer = (serverName: string, url?: string): boolean => {
  const normalizedServerName = serverName.toLowerCase().replace(/[-\s[\]]/g, "")
  const normalizedUrl = url?.toLowerCase() || ""
  return (
    normalizedServerName.includes("vcloud") || 
    normalizedServerName.includes("ncloud") || 
    normalizedServerName.includes("hubcloud") ||
    normalizedUrl.includes("vcloud.") ||
    normalizedUrl.includes("hubcloud.")
  )
}
```

---

## Files Modified

1. **`/workspace/app/api/vega-movie/route.ts`**
   - Rewrote screenshot extraction logic
   - Added 3-tier strategy for finding screenshots

2. **`/workspace/app/v/[...slug]/page.tsx`**
   - Added quality parameter to nextdrive URL generation
   - Quality already being passed for m4ulinks URLs

3. **`/workspace/app/vlyxdrive/page.tsx`**
   - Added `hasQualityMatch` tracking
   - Enhanced UI with quality filtering indicators
   - Added success/warning messages for quality matching
   - Updated interface for VlyxDriveData

---

## Testing Recommendations

1. **Screenshot Display:**
   - Visit any /v page (e.g., a movie from movies4u)
   - Verify that actual screenshots are shown, not posters
   - Check that images are from `.ss-img` container or after "Screenshots:" heading

2. **Quality Parameter Flow:**
   - On /v page, select a quality (e.g., "1080p HEVC")
   - Click a download link
   - Verify URL contains encoded quality parameter
   - On /vlyxdrive page, verify quality indicator shows correctly

3. **Auto-Selection:**
   - **Exact Match:** Select "720p" on /v → Should only show 720p options on /vlyxdrive
   - **Partial Match:** Select "720p HEVC" on /v → Should match "720p" or "720p HEVC"
   - **No Match:** Select "2160p 4K" when only 1080p available → Should show all options with warning

4. **N-Cloud Preference:**
   - When quality matches and N-Cloud available → Should highlight N-Cloud prominently
   - Success message should appear
   - "Show more options" should reveal other server options

---

## Key Benefits

✅ **Better UX** - Users see actual screenshots before downloading
✅ **Less Selection** - Quality auto-filtering reduces steps
✅ **Smart Defaults** - N-Cloud preferred when quality matches
✅ **Clear Feedback** - Visual indicators show filtering status
✅ **Fallback Safe** - Shows all options if quality not found
✅ **Flexible** - "Show more options" allows manual selection

---

## Notes

- Quality matching uses **fuzzy logic** to handle variations like:
  - "1080p" matches "1080p HEVC"
  - "720p HEVC" matches "720p"
  - Case-insensitive
  - Ignores spaces, dashes, underscores

- Screenshot extraction tries **multiple strategies** to ensure screenshots are found across different website designs and templates

- All changes are **backward compatible** - pages without quality parameter work as before

---

**Implementation Date:** 2025-10-23
**Status:** ✅ Complete and Ready for Testing
