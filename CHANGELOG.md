# Changelog

## [1.2.0] - 2025-08-21

### 📝 Content Updates

#### **Leadership Letter Refresh**
- **Updated content**: Replaced leadership letter text with new version from PDF
- **New title**: Added "A New Way to Connect Your Community" as main heading
- **Streamlined messaging**: More concise and focused content
- **Updated contact info**: Changed email to info@thecommunityobserver.com
- **Archived original**: Preserved old version as leadership-letter-old.astro
- **PDF update**: Now links to exec-letter-v2.pdf

### 🗂️ File Structure Changes

#### **Added Files**
- `src/pages/leadership-letter-old.astro` (archived original version)

#### **Updated Files**
- `src/pages/leadership-letter.astro` - Complete content refresh with new messaging

---

## [1.1.0] - 2025-08-21

### 🚀 Major Features

#### **Single Source Article System**
- **Implemented dynamic article generation** from JSON files
- **Eliminated content duplication** - articles now managed in one place
- **Simplified workflow** - only need to create JSON files for new articles
- **Automatic page generation** - Astro creates article pages from JSON data

#### **New Article Management**
- **Dynamic route**: `src/pages/articles/[slug].astro` generates all article pages
- **JSON-based content**: All articles stored in `src/data/articles/`
- **Static site generation**: All article pages pre-built for performance
- **HTML rendering**: Proper rendering of HTML content in articles

### 📝 Content Updates

#### **Submission Guidelines**
- **Updated word limits**: Changed "300-800 words" to "up to 800 words" for News Articles
- **Added photo formats**: Specified JPEG, PNG, TIFF formats for photo submissions
- **Extended deadlines**: Updated submission deadline to "two weeks before publication"
- **Enhanced event listings**: Added "Earlier submissions encouraged" note
- **Improved editorial policy**: Italicized "Community Observer" throughout

#### **New Articles**
- **Community Center Approval**: Created new article about town council approving community center
- **Updated article links**: Fixed homepage card linking to correct articles
- **Consistent branding**: Italicized "Community Observer" throughout all content

### 🎨 UI/UX Improvements

#### **Hero Component Alignment**
- **Fixed photo alignment**: Improved vertical alignment of side images with text
- **Enhanced minimal layout**: Better centering for pages without side images
- **Consistent spacing**: Improved visual balance across all hero sections

#### **Form Improvements**
- **Enhanced validation**: Better client-side form validation
- **Improved error handling**: More robust form submission error handling
- **Better accessibility**: Enhanced form accessibility features

### 🔧 Technical Improvements

#### **Code Quality**
- **Fixed linter errors**: Resolved TypeScript and Astro component issues
- **Improved component props**: Updated AdSlot component usage
- **Enhanced error handling**: Better error handling throughout the application

#### **Performance**
- **Static generation**: All article pages pre-built for faster loading
- **Optimized routing**: Dynamic routes with proper static path generation
- **Better caching**: Static content improves caching and SEO

### 🗂️ File Structure Changes

#### **Removed Files**
- `src/pages/articles/local-business-expansion.astro`
- `src/pages/articles/community-center-approval.astro`
- `src/pages/articles/summer-festival-2025.astro`
- `src/pages/articles/youth-soccer-championship.astro`

#### **Added Files**
- `src/pages/articles/[slug].astro` (dynamic article generator)
- `src/data/articles/community-center-approval.json`

#### **Updated Files**
- `src/utils/articles.js` - Enhanced to support single source system
- `src/data/articles/*.json` - Updated to use `description` instead of `excerpt`
- `src/pages/index.astro` - Fixed article card links
- `src/pages/submission-guidelines.astro` - Multiple content updates
- `src/components/Hero.astro` - Alignment improvements

### 📊 Article System Workflow

#### **Before (Two Files)**
1. Create Astro page with full article content
2. Create JSON file with metadata
3. Risk of content duplication and inconsistency

#### **After (Single File)**
1. Create JSON file with full article content and metadata
2. Article automatically appears on news page and generates individual page
3. No duplication, guaranteed consistency

### 🎯 Benefits

- **Faster content creation**: 50% reduction in files needed per article
- **Eliminated duplication**: Single source of truth for all content
- **Better consistency**: No risk of mismatched content between files
- **Improved performance**: Static generation for faster page loads
- **Enhanced SEO**: All pages exist at build time
- **Easier maintenance**: Simpler file structure and workflow

### 🔄 Migration Notes

- **Existing articles**: Automatically migrated to new system
- **Content preservation**: All existing content maintained
- **URL structure**: Article URLs remain the same
- **User experience**: No changes visible to end users

### 🚨 Breaking Changes

- **None**: All changes are backward compatible
- **URLs preserved**: Article URLs remain unchanged
- **Content intact**: All existing content preserved

### 📋 Future Considerations

- **Content management**: Consider adding a CMS for easier content editing
- **Image optimization**: Implement automatic image optimization
- **Search functionality**: Add article search capabilities
- **Related articles**: Implement related article suggestions

---

## [1.0.0] - 2025-08-05

### 🎉 Initial Release
- **Community Observer website** with local news focus
- **Responsive design** with modern UI/UX
- **Article system** with featured and regular articles
- **Contact forms** with email integration
- **Submission guidelines** for community contributors
- **Advertising information** for local businesses
- **Accessibility features** throughout the site
