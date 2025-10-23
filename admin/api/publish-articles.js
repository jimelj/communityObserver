// API endpoint to publish articles
// Mark this endpoint as server-rendered (not pre-rendered)
export const prerender = false;

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

export async function POST({ request }) {
  try {
    console.log('API: Received POST request to publish-articles');
    
    const body = await request.json();
    const { articles } = body;
    
    if (!articles || !Array.isArray(articles)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No articles provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`API: Publishing ${articles.length} articles`);
    
    const results = [];
    const errors = [];

    for (const article of articles) {
      try {
        // Generate a slug from the title
        const slug = article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        // Create the article JSON object
        const articleData = {
          id: slug,
          slug: slug,
          title: article.title,
          description: article.description,
          date: article.date,
          author: article.author,
          category: article.category,
          tags: article.tags || [],
          image: article.image || '/images/placeholder-council.jpg',
          featured: article.featured || false,
          content: article.content.map(block => {
            if (typeof block === 'string') {
              return {
                type: 'paragraph',
                text: block
              };
            }
            return block;
          })
        };

        // Handle image: if it's a data URL, persist it under public/images/extracted
        let imagePath = articleData.image;
        if (typeof article.image === 'string' && article.image.startsWith('data:image/')) {
          const match = article.image.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
          if (match) {
            const mime = match[1];
            const ext = match[2] === 'jpeg' ? 'jpg' : match[2].toLowerCase();
            const base64Data = match[3];
            const buffer = Buffer.from(base64Data, 'base64');
            const imagesDir = join(projectRoot, 'public', 'images', 'extracted');
            await mkdir(imagesDir, { recursive: true });
            const imageFileName = `${slug}-${Date.now()}.${ext}`;
            const imageFilePath = join(imagesDir, imageFileName);
            await writeFile(imageFilePath, buffer);
            imagePath = `/images/extracted/${imageFileName}`;
            articleData.image = imagePath;
          }
        }

        // Determine file path for article JSON
        const articlesDir = join(projectRoot, 'src', 'data', 'articles');
        const filePath = join(articlesDir, `${slug}.json`);
        
        // Write the JSON file
        await writeFile(filePath, JSON.stringify(articleData, null, 2));
        
        console.log(`API: ✓ Published article: ${slug}`);
        results.push({
          slug,
          title: article.title,
          filePath: `src/data/articles/${slug}.json`,
          image: imagePath
        });
        
      } catch (error) {
        console.error(`API: ✗ Error publishing article "${article.title}":`, error);
        errors.push({
          title: article.title,
          error: error.message
        });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to publish articles',
        details: errors
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clean up temporary images after successful publishing
    try {
      const cleanupResponse = await fetch(new URL('/api/cleanup-temp-images', request.url), {
        method: 'POST'
      });

      if (cleanupResponse.ok) {
        const cleanupResult = await cleanupResponse.json();
        console.log(`API: Cleanup completed - ${cleanupResult.message}`);
      }
    } catch (cleanupError) {
      console.warn('API: Cleanup failed (non-critical):', cleanupError.message);
      // Don't fail the publish if cleanup fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully published ${results.length} article(s)`,
      published: results,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API: Error in publish-articles:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to publish articles: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

