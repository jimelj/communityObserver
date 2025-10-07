# PDF Article Extraction Guide

## How It Works

The article extraction system uses a **generic pattern-based approach** that works with any newspaper PDF by looking for common structural elements found in most newspapers.

## Extraction Strategies

The system tries three different strategies in order, and combines their results:

### 1. **Byline Detection** (Most Reliable)
- Looks for author attribution patterns:
  - "By John Smith"
  - "Written by Jane Doe"
  - "Author: Michael Johnson"
- Extracts the title from text immediately before the byline
- Captures content from the byline until the next byline

**Works best for:** Newspapers with consistent byline formatting

### 2. **Title Pattern Matching**
- Identifies capitalized headlines (15-150 characters)
- Filters out common non-article text:
  - Navigation ("See Page 4-5")
  - Dates and months
  - Section headers
  - URLs and contact info
  - Page numbers
- Extracts content following each detected title

**Works best for:** Newspapers with clear headline formatting

### 3. **Section Header Detection**
- Looks for common newspaper sections:
  - "Out & About"
  - "Business Briefs"
  - "Sports Briefs"
  - "Local News"
  - "Community News"
  - "Features"
  - "Opinion"
  - "Editorial"
- Extracts content from these sections

**Works best for:** Newspapers with standard section organization

### 4. **Fallback Chunking**
- If fewer than 3 articles are found, the system falls back to:
- Splitting the text into ~500-word chunks
- Creating generic "Article X" entries

**When this happens:** The PDF's structure couldn't be parsed by the other methods

## What to Expect with Different Newspapers

### ✅ Works Best With:
- **Clear bylines** with author names
- **Distinct headlines** in title case or all caps
- **Standard sections** (Business, Sports, etc.)
- **Consistent formatting** across articles

### ⚠️ May Need Manual Review:
- **Photo captions** extracted as separate articles
- **Pull quotes** identified as headlines
- **Advertisements** mixed with content
- **Multi-column layouts** with text flow issues

### ❌ Difficult to Extract:
- **Magazine-style layouts** with overlapping text
- **Heavy graphics** with minimal text
- **Non-standard fonts** that don't extract well
- **Scanned PDFs** with poor OCR quality

## Improving Results

### For Better Extraction:
1. **Upload high-quality PDFs** (not scanned images)
2. **Use text-based PDFs** (not image-based)
3. **Ensure consistent formatting** in your source document
4. **Review and edit** extracted articles using the Edit button

### Manual Review Checklist:
- ✓ Article titles are accurate
- ✓ Content is complete (no truncation)
- ✓ No duplicate content
- ✓ No navigation text mixed in
- ✓ Author attribution is correct
- ✓ Categories are appropriate

## Technical Details

### Text Extraction
- Uses `pdfjs-dist` library for PDF parsing
- Extracts text from all pages sequentially
- Preserves spacing but may lose formatting

### Pattern Matching
- Regular expressions for bylines: `/(?:By|Written by|Author)[\s:]+([A-Z][a-z]+...)/gi`
- Title detection: `/([A-Z][A-Za-z\s,':&-]{14,150}?)(?=[\n\r]|By\s|$)/g`
- Filters common false positives

### Content Organization
- Auto-detects categories from content keywords
- Generates descriptions from first 30 words
- Creates tags based on detected category
- Calculates word counts

## Troubleshooting

### "Only 1-2 articles extracted"
**Possible causes:**
- PDF has unique formatting
- Text is in non-standard layout
- Few or no bylines

**Solutions:**
- Check console logs for detected patterns
- Manually edit/split extracted content
- Try different PDF export settings

### "Extraction shows navigation text"
**Possible causes:**
- Navigation elements look like headlines
- "See Page X" patterns not filtered

**Solutions:**
- Use Edit button to fix titles
- Remove unwanted content manually

### "Articles are cut off"
**Possible causes:**
- Multiple headlines detected in sequence
- Article boundary detection failed

**Solutions:**
- Edit article to add missing content
- Merge related articles if needed

## Future Enhancements

Potential improvements for better extraction:

1. **AI-powered detection** using OpenAI/Claude APIs
2. **Learning from user edits** to improve patterns
3. **Image extraction** for article photos
4. **Layout analysis** for complex multi-column designs
5. **Custom patterns** per newspaper publication
6. **OCR improvement** for scanned PDFs

## Console Logging

The extraction process logs detailed information to the browser console:

```
API: Received POST request to extract-articles
API: PDF loaded successfully
API: Pages: 16
API: Text extracted successfully
API: Text length: 45234
API: First 1500 characters: [preview of text]
API: Found 4 author bylines
API: Sample bylines: ['By John Smith', 'By Jane Doe']
API: Found 12 potential article titles
API: Sample titles: ['Local Business Opens', 'City Council Meeting']
API: Found 8 articles total
```

Check these logs to understand what the system detected and where it might need adjustment.

