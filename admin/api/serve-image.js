import { join, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Disable prerendering for this dynamic route
export const prerender = false;

export async function GET({ params }) {
  // Get path from URL params (e.g., /api/serve-image/images/extracted/file.png)
  const pathSegments = params.path; // This is the catchall [...path]
  const imagePath = '/' + pathSegments; // Add leading slash back

  console.log('Serve-Image API called');
  console.log('  Path segments:', pathSegments);
  console.log('  Full image path:', imagePath);

  if (!pathSegments) {
    console.log('  ERROR: Missing path parameter');
    return new Response('Missing image path', { status: 400 });
  }

  // Security: ensure the path is within the extracted images directory
  if (!imagePath.startsWith('/images/extracted/')) {
    console.log('  ERROR: Invalid path - must start with /images/extracted/');
    return new Response('Invalid image path', { status: 403 });
  }

  // Remove leading slash and construct full path
  const relativePath = imagePath.substring(1); // Remove leading /
  const fullPath = join(projectRoot, 'public', relativePath);

  console.log('  Full disk path:', fullPath);

  if (!existsSync(fullPath)) {
    return new Response('Image not found', { status: 404 });
  }

  try {
    const imageBuffer = await readFile(fullPath);

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Error serving image:', error);
    return new Response('Error reading image', { status: 500 });
  }
}
