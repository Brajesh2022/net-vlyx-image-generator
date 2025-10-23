# Multiple Watch Links & Language Variants Implementation

## Summary

Implemented comprehensive support for handling multiple watch links with different language/version variants on the /v and /play-here pages. Users can now clearly see and select from different language options (Hindi+Tamil, Telugu, etc.) with color-coded visual indicators.

---

## Changes Made

### 1. **Updated API to Parse Multiple Watch Links**

**File:** `/workspace/app/api/movies4u-movie/route.ts`

#### Added New Interfaces:
```typescript
interface WatchLink {
  url: string
  label: string
}
```

#### Updated MovieDetails Interface:
```typescript
interface MovieDetails {
  // ... existing fields
  watchOnlineUrl: string | null  // Kept for backward compatibility
  watchLinks: WatchLink[]        // ✅ NEW: Multiple watch links with labels
  downloadSections: {
    title: string
    downloads: {
      quality: string
      size: string
      variant?: string  // ✅ NEW: Language/version variant
      links: { ... }[]
    }[]
  }[]
}
```

#### Enhanced Parsing Logic:

**Extract ALL Watch Links:**
```typescript
// Extract ALL "Watch Online" links from div.watch-links-div
const watchLinks: WatchLink[] = []
$("div.watch-links-div a.btn-zip, div.watch-links-div a.btn").each((i, el) => {
  const $link = $(el)
  const url = $link.attr("href")
  if (url) {
    // Extract label - clean to get language/version only
    let label = $link.text().trim()
    const match = label.match(/\[(.*?)\]/)
    const variant = match ? match[1] : label.replace("Watch Online", "").trim()
    
    watchLinks.push({
      url,
      label: variant || "Watch Online",
    })
  }
})
```

**Extract Language Variants from Quality Headers:**
```typescript
// Extract language/version variant from span tag or brackets
// Example: <h4>War 2 (2025) <span>[Hindi + Tamil]</span> 480p [750MB]</h4>
let variant = ""
const $span = $header.find("span")
if ($span.length) {
  const spanText = $span.text().trim()
  const variantMatch = spanText.match(/\[(.*?)\]/)
  variant = variantMatch ? variantMatch[1] : spanText
}
```

---

### 2. **Updated /v Page to Pass Multiple Watch Links**

**File:** `/workspace/app/v/[...slug]/page.tsx`

#### Modified URL Generation:
```typescript
const handleContinuePlayHere = () => {
  const imdbId = getImdbId()
  if (imdbId) {
    let url = `/play-here?id=${imdbId}`
    
    // ✅ Support multiple watch links
    if (movieDetails?.watchLinks && movieDetails.watchLinks.length > 0) {
      // Add all watch links as extra, extra2, extra3, etc.
      movieDetails.watchLinks.forEach((watchLink, index) => {
        const paramName = index === 0 ? 'extra' : `extra${index + 1}`
        url += `&${paramName}=${encodeURIComponent(watchLink.url)}`
        
        // Add button labels as button1, button2, button3, etc.
        url += `&button${index + 1}=${encodeURIComponent(watchLink.label)}`
      })
    }
    
    window.location.href = url
  }
}
```

**Example Generated URL:**
```
/play-here?id=tt27425164
  &extra=https://m4uplay.com/file/2xms5aat14kq
  &button1=Hindi + Tamil
  &extra2=https://m4uplay.com/file/ebb0xkyxb1lw
  &button2=Telugu
```

#### Added Color-Coded Variant Display:
```typescript
{item.download.variant && (
  <span className={`ml-2 font-semibold ${
    item.download.variant.toLowerCase().includes('hindi') && 
    item.download.variant.toLowerCase().includes('tamil')
      ? 'text-orange-400'      // Hindi + Tamil = Orange
      : item.download.variant.toLowerCase().includes('telugu')
      ? 'text-purple-400'      // Telugu = Purple
      : item.download.variant.toLowerCase().includes('hindi')
      ? 'text-yellow-400'      // Hindi = Yellow
      : item.download.variant.toLowerCase().includes('tamil')
      ? 'text-green-400'       // Tamil = Green
      : 'text-cyan-400'        // Others = Cyan
  }`}>
    • [{item.download.variant}]
  </span>
)}
```

---

### 3. **Updated /play-here Page with Modal for Multiple Links**

**File:** `/workspace/app/play-here/page.tsx`

#### Extract All Watch Options:
```typescript
interface WatchOption {
  url: string
  label: string
}

const watchOptions: WatchOption[] = []

// Check for extra, extra2, extra3, etc. and button1, button2, button3, etc.
let index = 1
while (true) {
  const paramName = index === 1 ? 'extra' : `extra${index}`
  const buttonName = `button${index}`
  
  const url = searchParams.get(paramName)
  if (!url) break
  
  const label = searchParams.get(buttonName) || `Watch Option ${index}`
  watchOptions.push({ url, label })
  index++
}
```

#### Smart Button Display:
```typescript
{watchOptions.length === 1 ? (
  // Single watch link - direct button
  <a href={watchOptions[0].url} target="_blank">
    <Button>If above player not work then click me</Button>
  </a>
) : (
  // Multiple watch links - show popup
  <Button onClick={() => setShowWatchOptionsModal(true)}>
    If above player not work then click me ({watchOptions.length} options)
  </Button>
)}
```

#### Color-Coded Modal Popup:
```typescript
<Dialog open={showWatchOptionsModal}>
  <DialogContent>
    <DialogTitle>Select Watch Option</DialogTitle>
    
    {watchOptions.map((option, index) => {
      const getColorClass = (label: string) => {
        const lowerLabel = label.toLowerCase()
        if (lowerLabel.includes('hindi') && lowerLabel.includes('tamil')) {
          return 'from-orange-600 to-red-600 border-orange-500/50'
        } else if (lowerLabel.includes('telugu')) {
          return 'from-blue-600 to-purple-600 border-blue-500/50'
        } else if (lowerLabel.includes('hindi')) {
          return 'from-yellow-600 to-orange-600 border-yellow-500/50'
        } else if (lowerLabel.includes('tamil')) {
          return 'from-green-600 to-teal-600 border-green-500/50'
        } else if (lowerLabel.includes('english')) {
          return 'from-cyan-600 to-blue-600 border-cyan-500/50'
        } else {
          return 'from-gray-600 to-gray-700 border-gray-500/50'
        }
      }
      
      return (
        <a href={option.url} target="_blank">
          <div className={`bg-gradient-to-r ${getColorClass(option.label)}`}>
            <h3>Watch Online {option.label}</h3>
            <p>Button {index + 1}</p>
          </div>
        </a>
      )
    })}
  </DialogContent>
</Dialog>
```

---

## Color Coding System

### **Language Variant Colors:**

| Language/Version | Color | Gradient Class |
|-----------------|-------|----------------|
| **Hindi + Tamil** | 🟠 Orange/Red | `from-orange-600 to-red-600` |
| **Telugu** | 🟣 Purple/Blue | `from-blue-600 to-purple-600` |
| **Hindi** | 🟡 Yellow/Orange | `from-yellow-600 to-orange-600` |
| **Tamil** | 🟢 Green/Teal | `from-green-600 to-teal-600` |
| **English** | 🔵 Cyan/Blue | `from-cyan-600 to-blue-600` |
| **Others** | ⚫ Gray | `from-gray-600 to-gray-700` |

### **Text Color Coding (on /v page):**

| Language/Version | Text Color Class |
|-----------------|------------------|
| Hindi + Tamil | `text-orange-400` |
| Telugu | `text-purple-400` |
| Hindi | `text-yellow-400` |
| Tamil | `text-green-400` |
| Others | `text-cyan-400` |

---

## User Experience Flow

### **Example: War 2 Movie with Multiple Versions**

#### **On /v Page:**

**1. User sees quality options with variants:**
```
480p • 750MB • Movie Download • [Hindi + Tamil] ← Orange text
480p • 500MB • Movie Download • [Telugu] ← Purple text
```

**2. User clicks quality:**
- If selecting 480p, sees popup with both options
- Language variants clearly highlighted in different colors
- User chooses Hindi + Tamil or Telugu version

**3. User selects "Play Here":**
- Clicks "Choose Your Player" → "Play Here"
- Gets redirected to /play-here with ALL watch links

#### **On /play-here Page:**

**1. Single Watch Link:**
```
[If above player not work then click me] ← Direct button
```

**2. Multiple Watch Links:**
```
[If above player not work then click me (2 options)] ← Opens popup
```

**3. Popup Shows:**
```
┌────────────────────────────────────────┐
│ Select Watch Option                    │
├────────────────────────────────────────┤
│ [Watch Online Hindi + Tamil]  🟠      │ ← Orange gradient
│ Button 1                               │
├────────────────────────────────────────┤
│ [Watch Online Telugu]         🟣      │ ← Purple gradient
│ Button 2                               │
└────────────────────────────────────────┘
```

---

## Example Source Code Parsed

### **Input HTML:**
```html
<div class="watch-links-div">
  <div class="watch-btns-div">
    <a href="https://m4uplay.com/file/2xms5aat14kq" class="btn btn-zip">
      Watch Online [Hindi + Tamil]
    </a>
  </div>
  <div class="watch-btns-div">
    <a href="https://m4uplay.com/file/ebb0xkyxb1lw" class="btn btn-zip">
      Watch Online [Telugu]
    </a>
  </div>
</div>

<div class="download-links-div">
  <h4>War 2 (2025) <span>[Hindi + Tamil]</span> 480p [750MB]</h4>
  <div class="downloads-btns-div">
    <a href="https://m4ulinks.com/number/42184" class="btn">Download Links</a>
  </div>
  
  <h4><hr>War 2 (2025) <span>[Telugu]</span> 480p [500MB]</h4>
  <div class="downloads-btns-div">
    <a href="https://m4ulinks.com/number/42208" class="btn">Download Links</a>
  </div>
</div>
```

### **Parsed Result:**
```typescript
{
  watchLinks: [
    { url: "https://m4uplay.com/file/2xms5aat14kq", label: "Hindi + Tamil" },
    { url: "https://m4uplay.com/file/ebb0xkyxb1lw", label: "Telugu" }
  ],
  downloadSections: [
    {
      title: "War 2 (2025) [Hindi + Tamil] 480p [750MB]",
      downloads: [{
        quality: "480p",
        size: "750MB",
        variant: "Hindi + Tamil",  // ✅ Extracted
        links: [...]
      }]
    },
    {
      title: "War 2 (2025) [Telugu] 480p [500MB]",
      downloads: [{
        quality: "480p",
        size: "500MB",
        variant: "Telugu",  // ✅ Extracted
        links: [...]
      }]
    }
  ]
}
```

---

## Benefits

✅ **Clear Language Selection** - Users can easily see which version they're choosing  
✅ **Color-Coded Visuals** - Different colors for different languages make options distinct  
✅ **Multiple Watch Links** - All watch options accessible from play-here page  
✅ **Smart Popup** - Only shows popup when multiple options exist  
✅ **Backward Compatible** - Old single-link format still works  
✅ **No Confusion** - Same quality with different languages are now clearly differentiated  

---

## Files Modified

1. **`/workspace/app/api/movies4u-movie/route.ts`**
   - Added `WatchLink` interface
   - Updated `MovieDetails` interface with `watchLinks[]` and `variant` field
   - Enhanced parsing to extract all watch links with labels
   - Extract language variants from quality headers

2. **`/workspace/app/v/[...slug]/page.tsx`**
   - Updated `handleContinuePlayHere` to pass multiple watch links
   - Added URL parameters: `extra2`, `extra3`, `button1`, `button2`, `button3`, etc.
   - Added color-coded variant display in download cards

3. **`/workspace/app/play-here/page.tsx`**
   - Added `WatchOption` interface
   - Extract all watch options from URL parameters
   - Smart button: direct link for single option, popup for multiple
   - Added color-coded modal dialog with language-specific gradients

---

**Status:** ✅ Complete  
**No Linter Errors:** ✅  
**Date:** 2025-10-23
