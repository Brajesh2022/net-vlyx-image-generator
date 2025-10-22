# Movies4U Migration Status

## Project Overview
Migrating the entire scraping source from vegamovies sites to movies4u.contact

## Completed Tasks ✅

### 1. New API Routes Created
- ✅ `/api/movies4u-search` - Search movies4u.contact
  - Parses `<article>` tags from search results
  - Extracts title, image, and link from search page HTML
  
- ✅ `/api/movies4u-movie` - Parse movie/series pages
  - Extracts title, poster, IMDb rating/link
  - Parses movie info (season, episode, language, quality, etc.)
  - **NEW:** Extracts "Watch Online" URL from `div.watch-links-div`
  - **NEW:** Extracts screenshots from `div.container.ss-img`
  - **NEW:** Parses download sections with quality from `div.download-links-div`
  
- ✅ `/api/m4ulinks-scraper` - Parse m4ulinks.com download pages
  - Extracts download links with quality information
  - Identifies vcloud and hubcloud links
  - Groups links by quality/episode

### 2. Page Updates Completed
- ✅ `/play-here` - Added `extra` parameter support
  - Displays alternative watch button if `extra` URL is provided
  - Button text: "If above player not work then click me"
  
- ✅ `/ncloud` - Enhanced vcloud/hubcloud support
  - Detects vcloud.zip URLs
  - Detects hubcloud URLs (any domain with "hubcloud")
  - Uses correct URL format for Hub-Cloud (`/drive/{id}`) vs V-Cloud (`/{id}`)
  - Logs detected cloud service type

## Remaining Tasks 📋

### 3. Update Home Page
- [ ] Replace vegamovies search with movies4u search
- [ ] Update search API endpoint from `/api/scrape-vega` to `/api/movies4u-search`
- [ ] Update category browsing to use movies4u.contact
- [ ] Keep TMDB integration for trending/popular sections

### 4. Update /v Page (Movie Details)
- [ ] Create new route handler or update existing to use movies4u
- [ ] Use `/api/movies4u-movie` instead of `/api/vega-movie`
- [ ] Display screenshots from movies4u in gallery layout
- [ ] Integrate "Watch Online" with Play Here feature:
  - Generate `/play-here?id=tt...&extra=[watch_url]` when watch URL exists
- [ ] Parse download sections with new structure
- [ ] Pass quality parameter to /vlyxdrive: `/vlyxdrive?url=...&quality=480p`

### 5. Update /vlyxdrive Page
- [ ] Add support for m4ulinks.com URLs (alongside existing nextdrive)
- [ ] Accept and use `quality` parameter from URL
- [ ] Filter links to show only matching quality
- [ ] Prioritize vcloud and hubcloud links:
  - Show vcloud/hubcloud first
  - Hide other links by default
- [ ] Add "Show More Quality Options" button
- [ ] Detect m4ulinks URLs and use `/api/m4ulinks-scraper`

### 6. Remove Vegamovies References
- [ ] Update `/api/category/[category]/route.ts` to use movies4u
- [ ] Remove or update vegamovies-specific APIs
- [ ] Update any hardcoded vegamovies URLs
- [ ] Search codebase for "vegamovies" and "vega" references

## New Architecture Flow

### Search Flow (movies4u)
1. User searches on home page
2. Home page calls `/api/movies4u-search?s={query}`
3. API scrapes movies4u.contact search results
4. Returns array of results with title, image, link

### Movie Details Flow (movies4u)
1. User clicks movie from search/home
2. Navigate to `/v` page with encoded movies4u URL
3. `/v` page calls `/api/movies4u-movie?url={movie_url}`
4. API returns:
   - Movie details (title, poster, IMDb, plot)
   - Screenshots array (for gallery)
   - Watch Online URL (optional)
   - Download sections with quality

### Watch Online Flow
1. If movie has "Watch Online" URL
2. Generate Play Here link: `/play-here?id={imdb_id}&extra={watch_url}`
3. Play Here page shows:
   - Primary video player (existing)
   - Alternative button linking to watch URL (NEW)

### Download Flow (movies4u)
1. User selects quality on /v page
2. Navigate to `/vlyxdrive?url={m4ulinks_url}&quality={quality}`
3. `/vlyxdrive` page calls `/api/m4ulinks-scraper?url={url}`
4. API returns links grouped by quality
5. Page filters to show only matching quality
6. Prioritizes vcloud/hubcloud links
7. "Show More" button reveals other options

### Download Link Processing
1. vcloud.zip links → send to `/ncloud` (treated as ncloud)
2. hubcloud.* links → send to `/ncloud` (treated as ncloud)
3. Other links → open in new tab

## Key Differences: Vegamovies vs Movies4U

### Search Results
- **Vegamovies:** `article.entry-card` or `article.post-item`
- **Movies4U:** `<article>` with `h3.entry-title a`

### Movie Page Structure
- **Vegamovies:** Uses `.single-service-content`, `.entry-inner`
- **Movies4U:** Uses similar structure but with different class names
  - Watch Online: `div.watch-links-div`
  - Screenshots: `div.container.ss-img`
  - Downloads: `div.download-links-div`

### Download Links
- **Vegamovies:** Links to nexdrive.pro/biz/ink
- **Movies4U:** Links to m4ulinks.com (which then shows vcloud/hubcloud/gdrive)

### Link Providers
- **Vegamovies:** NextDrive, V-Cloud, GDirect, GDToT
- **Movies4U:** vcloud.zip, hubcloud.fit, G-Drive, others

## Testing Checklist
- [ ] Search functionality works with movies4u
- [ ] Movie details page displays correctly
- [ ] Screenshots gallery displays properly
- [ ] Watch Online integration works
- [ ] Download links are properly filtered by quality
- [ ] vcloud links work via /ncloud
- [ ] hubcloud links work via /ncloud
- [ ] "Show More Quality Options" button works
- [ ] Multi-season series handled correctly
- [ ] Episode-wise downloads work

## Notes
- Keep TMDB integration unchanged (trending, popular, etc.)
- Maintain backward compatibility where possible
- The fundamental flow (Search → Movie Page → Download) remains the same
- The domain movies4u.contact may change; structure should remain adaptable
