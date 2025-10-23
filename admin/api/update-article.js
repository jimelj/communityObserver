import { writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Disable prerendering for this dynamic route
export const prerender = false;

export async function POST({ request }) {
  try {
    console.log('API: Received POST request to update-article');

    const body = await request.json();
    const { filename, article } = body;

    if (!filename || !article) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing filename or article data'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const articlesDir = join(projectRoot, 'src', 'data', 'articles');
    const filePath = join(articlesDir, filename);

    // Read the existing article to preserve any fields not in the update
    let existingArticle = {};
    try {
      const content = await readFile(filePath, 'utf-8');
      existingArticle = JSON.parse(content);
    } catch (error) {
      console.log('API: No existing article found, creating new one');
    }

    // Merge with existing article
    const updatedArticle = {
      ...existingArticle,
      ...article,
      // Ensure content is properly formatted
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

    // Write the updated article
    await writeFile(filePath, JSON.stringify(updatedArticle, null, 2));

    console.log(`API: ✓ Updated article: ${filename}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Article ${filename} updated successfully`,
      article: updatedArticle
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API: Error updating article:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
