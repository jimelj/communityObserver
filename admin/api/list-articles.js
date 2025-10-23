import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Disable prerendering for this dynamic route
export const prerender = false;

export async function GET({ request }) {
  try {
    console.log('API: Received GET request to list-articles');

    const articlesDir = join(projectRoot, 'src', 'data', 'articles');

    // Read all JSON files in the articles directory
    const files = await readdir(articlesDir);
    const articleFiles = files.filter(f => f.endsWith('.json'));

    console.log(`API: Found ${articleFiles.length} articles`);

    // Read each article file
    const articles = [];
    for (const file of articleFiles) {
      try {
        const filePath = join(articlesDir, file);
        const content = await readFile(filePath, 'utf-8');
        const article = JSON.parse(content);

        articles.push({
          ...article,
          filename: file
        });
      } catch (error) {
        console.error(`API: Error reading article ${file}:`, error.message);
      }
    }

    // Sort by date (newest first)
    articles.sort((a, b) => new Date(b.date) - new Date(a.date));

    return new Response(JSON.stringify({
      success: true,
      articles,
      count: articles.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API: Error listing articles:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
