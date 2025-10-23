import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory (for viewing images, etc.)
app.use('/images', express.static(join(projectRoot, 'public', 'images')));
app.use('/public', express.static(join(projectRoot, 'public')));

// Serve admin UI
app.use('/admin', express.static(__dirname));

// API Routes - dynamically import from admin/api directory
const apiFiles = [
  'extract-articles.js',
  'publish-articles.js',
  'copy-article-image.js',
  'cleanup-temp-images.js',
  'serve-image.js'
];

// Load API routes dynamically
for (const file of apiFiles) {
  const route = file.replace('.js', '');
  try {
    const module = await import(`./api/${file}`);

    if (module.GET) {
      app.get(`/api/${route}`, async (req, res) => {
        const response = await module.GET({ request: req, params: req.params });
        const body = await response.text();
        res.status(response.status).set(Object.fromEntries(response.headers)).send(body);
      });
    }

    if (module.POST) {
      app.post(`/api/${route}`, async (req, res) => {
        const response = await module.POST({ request: req, params: req.params });
        const body = await response.text();
        res.status(response.status).set(Object.fromEntries(response.headers)).send(body);
      });
    }

    console.log(`✓ Loaded API route: /api/${route}`);
  } catch (error) {
    console.warn(`⚠ Could not load API route: /api/${route}`, error.message);
  }
}

// Special handling for serve-image with path parameter
app.get('/api/serve-image/*', async (req, res) => {
  try {
    const module = await import('./api/serve-image.js');
    const pathParam = req.params[0]; // Get the wildcard path
    const response = await module.GET({
      request: req,
      params: { path: pathParam }
    });

    const buffer = await response.arrayBuffer();
    res.status(response.status)
       .set(Object.fromEntries(response.headers))
       .send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).send('Error serving image');
  }
});

// Root redirect to admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║   📰  Community Observer - Admin Tool                ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log('');
  console.log('  Ready to extract articles from PDF!');
  console.log('');
});
