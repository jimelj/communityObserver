# Community Observer - Admin Tool

This is a **local-only** admin tool for extracting articles from newspaper PDFs. It does NOT deploy to production.

## Quick Start

From the project root:

```bash
npm run admin
```

Then open: **http://localhost:3000/admin**

## What It Does

1. **Extract Articles**: Upload a newspaper PDF and extract articles with AI
2. **Select Photos**: Manually choose which photos go with each article
3. **Edit Content**: Review and edit articles before publishing
4. **Publish**: Save articles to `src/data/articles/` and images to `public/images/articles/`

## Weekly Workflow

### Step 1: Start Admin Server
```bash
npm run admin
```

### Step 2: Extract Articles
1. Open http://localhost:3000/admin
2. Upload this week's newspaper PDF
3. Wait for extraction to complete
4. Review extracted articles

### Step 3: Assign Photos
1. Click "Select Photo" on each article
2. Choose the correct image from the thumbnails
3. Repeat for all articles

### Step 4: Edit & Review
1. Click "Edit" on any article to fix typos or adjust content
2. Verify all information is correct

### Step 5: Publish to Website
1. Click "Publish Selected" to save articles
2. Articles are saved to `src/data/articles/*.json`
3. Images are saved to `public/images/articles/*.png`

### Step 6: Push to GitHub
```bash
git add src/data/articles/ public/images/articles/
git commit -m "Add articles from [date] edition"
git push
```

Cloudflare Pages will automatically deploy the updated site!

## File Structure

```
admin/
├── index.html          # Admin dashboard UI
├── server.js           # Express server
├── package.json        # Admin dependencies
├── api/                # API endpoints
│   ├── extract-articles.js
│   ├── publish-articles.js
│   ├── copy-article-image.js
│   ├── cleanup-temp-images.js
│   └── serve-image.js
└── README.md           # This file
```

## Requirements

- Node.js 18+
- Poppler tools (`pdfimages` command)
  - macOS: `brew install poppler`
  - Linux: `sudo apt-get install poppler-utils`
  - Windows: Download from https://blog.alivate.com.au/poppler-windows/

## Security

⚠️ **This admin tool is for local use only!**

- Never deploy the `admin/` folder to production
- Only runs on localhost
- No authentication needed (local-only access)
- GitHub repository access controls who can publish

## Troubleshooting

**Admin won't start:**
```bash
cd admin
npm install
npm start
```

**Images not extracting:**
- Make sure Poppler is installed: `pdfimages --version`

**Can't access admin dashboard:**
- Check if port 3000 is already in use
- Try a different port in `server.js`

## Notes

- Temp files are automatically cleaned up after publishing
- All article data is version-controlled in git
- Changes deploy automatically via Cloudflare Pages
