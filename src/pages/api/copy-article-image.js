import { copyFile, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { promisify } from 'node:util';

const copyFileAsync = promisify(copyFile);

// Disable prerendering for this dynamic route
export const prerender = false;

export async function POST({ request }) {
  try {
    const { tempImagePath } = await request.json();

    if (!tempImagePath) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing tempImagePath'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Security: ensure path is within extracted images directory
    if (!tempImagePath.startsWith('/images/extracted/')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid image path'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct full paths
    const tempFullPath = join(process.cwd(), 'public', tempImagePath.substring(1));
    const filename = basename(tempImagePath);
    const permanentPath = join(process.cwd(), 'public', 'images', 'articles', filename);
    const permanentWebPath = `/images/articles/${filename}`;

    // Check if temp file exists
    if (!existsSync(tempFullPath)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Temp image not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Copy file to permanent location
    await copyFileAsync(tempFullPath, permanentPath);

    console.log(`API: Copied image from ${tempImagePath} to ${permanentWebPath}`);

    return new Response(JSON.stringify({
      success: true,
      permanentPath: permanentWebPath
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API: Error copying image:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
