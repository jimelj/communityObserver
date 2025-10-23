import { unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Disable prerendering for this dynamic route
export const prerender = false;

export async function POST({ request }) {
  try {
    console.log('API: Received POST request to delete-article');

    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing filename'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid filename'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const articlesDir = join(projectRoot, 'src', 'data', 'articles');
    const filePath = join(articlesDir, filename);

    // Delete the article file
    await unlink(filePath);

    console.log(`API: ✓ Deleted article: ${filename}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Article ${filename} deleted successfully`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API: Error deleting article:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
