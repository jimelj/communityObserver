import { rm, readdir, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'url';

const rmAsync = promisify(rm);
const readdirAsync = promisify(readdir);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Disable prerendering for this dynamic route
export const prerender = false;

export async function POST({ request }) {
  try {
    const extractedDir = join(projectRoot, 'public', 'images', 'extracted');
    const tempPdfDir = join(projectRoot, 'temp-pdf-extract');

    let deletedCount = 0;
    const deletedDirs = [];

    // Clean up extracted images directory
    if (existsSync(extractedDir)) {
      const files = await readdirAsync(extractedDir);

      for (const file of files) {
        // Skip .gitkeep if it exists
        if (file === '.gitkeep') continue;

        const filePath = join(extractedDir, file);
        await rmAsync(filePath, { force: true });
        deletedCount++;
      }

      deletedDirs.push('images/extracted');
      console.log(`API: Deleted ${deletedCount} temp images from ${extractedDir}`);
    }

    // Clean up temp PDF extraction directory
    if (existsSync(tempPdfDir)) {
      await rmAsync(tempPdfDir, { recursive: true, force: true });
      deletedDirs.push('temp-pdf-extract');
      console.log(`API: Deleted temp PDF extraction directory: ${tempPdfDir}`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Cleaned up ${deletedCount} temp images`,
      deletedCount,
      deletedDirs
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API: Error cleaning up temp images:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
