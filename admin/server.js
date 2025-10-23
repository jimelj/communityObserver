import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const app = express();
const PORT = 3000;

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Helper function to convert Express request to Fetch API Request
async function createFetchRequest(req, file) {
  const url = `http://localhost:${PORT}${req.url}`;
  const headers = new Headers();

  // For file uploads, create a FormData object
  if (file) {
    const formData = new FormData();

    // Convert buffer to Blob and add to FormData
    const blob = new Blob([file.buffer], { type: file.mimetype });
    formData.append('pdfFile', blob, file.originalname);

    // Add other form fields
    if (req.body) {
      Object.entries(req.body).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return new Request(url, {
      method: req.method,
      body: formData,
    });
  }

  // For non-file requests
  Object.entries(req.headers).forEach(([key, value]) => {
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  });

  const init = {
    method: req.method,
    headers: headers,
  };

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    init.body = JSON.stringify(req.body);
  }

  return new Request(url, init);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory (for viewing images, etc.)
app.use('/images', express.static(join(projectRoot, 'public', 'images')));
app.use('/public', express.static(join(projectRoot, 'public')));

// Serve built assets (CSS, JS) from dist folder
app.use('/_astro', express.static(join(projectRoot, 'dist', '_astro')));
app.use('/js', express.static(join(projectRoot, 'dist', 'js')));

// Serve admin UI
app.use('/admin', express.static(__dirname));

// API Routes - dynamically import from admin/api directory
const apiFiles = [
  'extract-articles.js',
  'publish-articles.js',
  'copy-article-image.js',
  'cleanup-temp-images.js',
  'serve-image.js',
  'list-articles.js',
  'update-article.js',
  'delete-article.js'
];

// Load API routes dynamically
for (const file of apiFiles) {
  const route = file.replace('.js', '');
  try {
    const module = await import(`./api/${file}`);

    if (module.GET) {
      app.get(`/api/${route}`, async (req, res) => {
        const fetchRequest = createFetchRequest(req);
        const response = await module.GET({ request: fetchRequest, params: req.params });
        const body = await response.text();
        res.status(response.status).set(Object.fromEntries(response.headers)).send(body);
      });
    }

    if (module.POST) {
      // Special handling for extract-articles which needs file upload
      if (route === 'extract-articles') {
        app.post(`/api/${route}`, upload.single('pdfFile'), async (req, res) => {
          const fetchRequest = await createFetchRequest(req, req.file);
          const response = await module.POST({ request: fetchRequest, params: req.params });
          const body = await response.text();
          res.status(response.status).set(Object.fromEntries(response.headers)).send(body);
        });
      } else {
        app.post(`/api/${route}`, async (req, res) => {
          const fetchRequest = await createFetchRequest(req);
          const response = await module.POST({ request: fetchRequest, params: req.params });
          const body = await response.text();
          res.status(response.status).set(Object.fromEntries(response.headers)).send(body);
        });
      }
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
    const fetchRequest = createFetchRequest(req);
    const response = await module.GET({
      request: fetchRequest,
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
