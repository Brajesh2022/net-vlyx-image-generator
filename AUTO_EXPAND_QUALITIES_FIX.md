# Auto-Expand Qualities When Parameter Missing or Mismatched

## Change Summary

**Automatically expand the "Show other qualities" dropdown when:**
1. `?quality` parameter is missing in URL
2. `?quality` parameter exists but doesn't match any available quality (e.g., `quality=360p` but source only has 480p, 720p, 1080p)

---

## Implementation

**File:** `/workspace/app/vlyxdrive/page.tsx`

**Before:**
```typescript
const [showOtherQualities, setShowOtherQualities] = useState(false)
// ❌ Always starts collapsed
```

**After:**
```typescript
import { useState, useEffect } from "react"

// Initial state: auto-expand if quality missing
const [showOtherQualities, setShowOtherQualities] = useState(!quality)

// Auto-expand if quality doesn't match after data loads
useEffect(() => {
  if (vlyxDriveData && quality && !vlyxDriveData.hasQualityMatch) {
    setShowOtherQualities(true) // Auto-expand when quality mismatch
  }
}, [vlyxDriveData, quality])
```

---

## Behavior

### **Case 1: Quality Parameter Exists AND Matches**
**URL:** `/vlyxdrive?key=...&quality=1080p`  
**Available:** 480p, 720p, 1080p, 2160p

**Display:**
```
┌─────────────────────────────────────┐
│ 1080p [3.3GB]         [Selected ✓] │
│ ⚡ Continue with N-Cloud            │
│ ▼ Show 2 more servers               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ▼ Show 6 other qualities            │  ← COLLAPSED ✅
└─────────────────────────────────────┘
```

**State:** `showOtherQualities = false` (collapsed)  
**Reason:** Quality found, user got what they wanted

---

### **Case 2: Quality Parameter Missing**
**URL:** `/vlyxdrive?key=...&action=download` (no `&quality=`)

**Display:**
```
┌─────────────────────────────────────┐
│ ▲ Hide other qualities              │  ← AUTO-EXPANDED ✅
│                                     │
│ ┌─ 480p [750MB] ▼                  │
│ │  └─ Hub-Cloud, GDFlix, G-Drive   │
│ ├─ 720p HEVC [1.2GB] ▼             │
│ │  └─ Hub-Cloud, GDFlix, G-Drive   │
│ ├─ 1080p [3.3GB] ▼                 │
│ │  └─ Hub-Cloud, GDFlix, G-Drive   │
│ └─ ... (more qualities)             │
└─────────────────────────────────────┘
```

**State:** `showOtherQualities = true` (expanded)  
**Reason:** No quality specified, show all options

---

### **Case 3: Quality Parameter Exists BUT Doesn't Match** ✅ NEW
**URL:** `/vlyxdrive?key=...&quality=360p`  
**Available:** 480p, 720p, 1080p, 2160p (NO 360p)

**Display:**
```
┌─────────────────────────────────────┐
│ ⚠️ 360p quality not found           │
│ Please select from available        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ▲ Hide other qualities              │  ← AUTO-EXPANDED ✅
│                                     │
│ ┌─ 480p [750MB] ▼                  │
│ │  └─ Hub-Cloud, GDFlix, G-Drive   │
│ ├─ 720p HEVC [1.2GB] ▼             │
│ │  └─ Hub-Cloud, GDFlix, G-Drive   │
│ ├─ 1080p [3.3GB] ▼                 │
│ │  └─ Hub-Cloud, GDFlix, G-Drive   │
│ └─ ... (more qualities)             │
└─────────────────────────────────────┘
```

**State:** `showOtherQualities = true` (auto-expanded by useEffect)  
**Reason:** Quality mismatch detected, user needs to choose another

---

## Logic Flow

```typescript
// Step 1: Initial Mount
quality = undefined
→ showOtherQualities = !quality = true (expanded immediately)

OR

quality = "1080p"
→ showOtherQualities = !quality = false (collapsed initially)

// Step 2: After Data Loads (useEffect runs)
if (vlyxDriveData && quality && !vlyxDriveData.hasQualityMatch) {
  setShowOtherQualities(true) // Force expand due to mismatch
}

// Examples:
quality = "1080p", hasQualityMatch = true
→ stays collapsed ✅

quality = "360p", hasQualityMatch = false
→ auto-expands ✅
```

---

## User Flow Examples

### **Scenario A: Quality Matches**
1. User selects "1080p HEVC" on /v page
2. URL: `/vlyxdrive?...&quality=1080p%20HEVC`
3. Page loads, finds 1080p HEVC in available qualities
4. **Result:** Only 1080p HEVC section shown, dropdown collapsed ✅

### **Scenario B: No Quality Parameter**
1. User clicks link without selecting quality (or old link format)
2. URL: `/vlyxdrive?...` (no quality param)
3. **Result:** Dropdown auto-expanded immediately, all qualities shown ✅
4. **User can:** Choose any quality they want

### **Scenario C: Quality Doesn't Match** ✅ NEW
1. User selects "360p" on /v page (or types manually)
2. URL: `/vlyxdrive?...&quality=360p`
3. Page loads, searches for 360p but only finds 480p, 720p, 1080p
4. `hasQualityMatch = false` detected
5. **Result:** 
   - Warning shown: "⚠️ 360p quality not found"
   - Dropdown auto-expanded by useEffect ✅
   - All available qualities shown
6. **User can:** Choose from 480p, 720p, or 1080p

---

## Benefits

✅ **Smart Default:** Show matched quality, or all options if no match  
✅ **Better UX:** No manual clicking needed when quality missing/mismatched  
✅ **Automatic Detection:** useEffect monitors data load and auto-expands on mismatch  
✅ **Clear Feedback:** Warning message + auto-expansion helps user understand the issue  
✅ **No Breaking Changes:** Existing functionality preserved

---

## Technical Details

**Initial State (on mount):**
- Uses `!quality` to determine initial expansion
- If `quality` undefined → expanded immediately
- If `quality` defined → collapsed initially (may expand later)

**After Data Load (useEffect):**
- Monitors `vlyxDriveData` and `quality`
- If quality exists but `hasQualityMatch = false` → force expand
- Runs only after data fetched, so no premature expansion

---

**Status:** ✅ Complete  
**Date:** 2025-10-23
