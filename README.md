# Community Observer Website

A modern, responsive website for Community Observer newspaper built with Astro, Tailwind CSS, and Cloudflare Pages.

## 🌟 Features

- **Modern Design**: Clean, professional newspaper aesthetic with responsive layout
- **SEO Optimized**: Complete meta tags, structured data, and XML sitemap
- **Accessibility**: WCAG AA compliant with proper semantic HTML and ARIA labels
- **Form Handling**: Contact forms with Cloudflare Worker backend and spam protection
- **Performance**: Optimized images, lazy loading, and fast loading times
- **Content Management**: Easy-to-update content structure for news and announcements

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Cloudflare account (for deployment)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd community-observer
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:4321 in your browser

### Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
community-observer/
├── public/                 # Static assets
│   ├── images/            # Images and graphics
│   ├── files/             # PDFs and documents
│   ├── js/                # Client-side JavaScript
│   ├── favicon.ico        # Site favicon
│   ├── robots.txt         # Search engine directives
│   └── sitemap.xml        # XML sitemap
├── src/
│   ├── components/        # Reusable components
│   │   ├── Header.astro   # Site header with navigation
│   │   ├── Footer.astro   # Site footer
│   │   ├── Hero.astro     # Hero section component
│   │   ├── Card.astro     # Content card component
│   │   ├── AdSlot.astro   # Advertisement slot component
│   │   └── Seo.astro      # SEO meta tags component
│   ├── layouts/           # Page layouts
│   │   ├── Page.astro     # Base page layout
│   │   ├── Article.astro  # Article page layout
│   │   └── Listing.astro  # Content listing layout
│   ├── pages/             # Website pages
│   │   ├── index.astro    # Homepage
│   │   ├── about.astro    # About page
│   │   ├── news.astro     # News listing
│   │   ├── contact.astro  # Contact page
│   │   ├── advertise.astro # Advertising page
│   │   ├── submission-guidelines.astro
│   │   ├── terms.astro    # Terms of service
│   │   └── privacy.astro  # Privacy policy
│   ├── styles/            # Global styles
│   │   └── global.css     # Tailwind CSS imports
│   └── assets/            # Processed assets
├── functions/             # Cloudflare Workers
│   └── sendEmail.js       # Form handling worker
├── astro.config.mjs       # Astro configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Dependencies and scripts
```

## 🎨 Design System

### Brand Colors

- **Navy**: #2C3E50 (Primary brand color)
- **Gray**: #7F8C8D (Secondary text)
- **Light**: #BDC3C7 (Accent and borders)
- **Paper**: #FDFEFE (Background)

### Typography

- **Headlines**: Merriweather (serif)
- **Body Text**: Inter (sans-serif)
- **Responsive**: Scales appropriately on all devices

### Components

- **Header**: Logo, navigation, contact info
- **Hero**: Page titles with optional descriptions
- **Cards**: Content preview with images and metadata
- **AdSlots**: Configurable advertisement placements
- **Forms**: Contact and submission forms with validation

## 📄 Pages Overview

### Homepage (`/`)
- Hero section with newspaper branding
- Mission statement and value proposition
- Featured community news
- Call-to-action sections

### About (`/about`)
- Company history and mission
- Executive letter excerpt
- Community focus information

### News (`/news`)
- Community news and announcements listing
- Category filtering
- Featured article section
- Pagination support

### Contact (`/contact`)
- Contact information cards
- Interactive contact form
- Business hours and response times
- Editorial and sales contacts

### Advertise (`/advertise`)
- Advertising opportunities
- Media kit download
- Sales contact information
- Ad size specifications

### Submission Guidelines (`/submission-guidelines`)
- Content submission instructions
- Editorial guidelines
- Deadlines and schedules
- Contact information for submissions

## 🔧 Configuration

### Environment Variables

For Cloudflare Worker email functionality:

```env
RESEND_API_KEY=your_resend_api_key
RATE_LIMIT=your_kv_namespace_binding
```

### Cloudflare Pages Setup

1. Connect your repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Configure environment variables if using email functionality

### Content Updates

#### Adding News Articles

1. Edit `src/pages/news.astro`
2. Add new article objects to the `announcements` array
3. Include title, excerpt, date, author, category, and image

#### Updating Contact Information

1. Edit contact details in `src/pages/contact.astro`
2. Update footer information in `src/components/Footer.astro`

#### Modifying Ad Slots

1. Edit `src/data/adSlots.json` for ad configurations
2. Update `src/components/AdSlot.astro` for display logic

## 🛠 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run astro` - Run Astro CLI commands

### Adding New Pages

1. Create new `.astro` file in `src/pages/`
2. Use appropriate layout from `src/layouts/`
3. Include SEO component with proper metadata
4. Update navigation in `src/components/Header.astro`

### Customizing Styles

1. Edit `tailwind.config.js` for design tokens
2. Modify `src/styles/global.css` for global styles
3. Use Tailwind classes in components

## 📱 Responsive Design

The website is fully responsive and tested on:

- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (320px - 767px)

Key responsive features:
- Flexible grid layouts
- Scalable typography
- Touch-friendly navigation
- Optimized images

## 🔒 Security Features

- **Spam Protection**: Honeypot fields and rate limiting
- **Form Validation**: Client and server-side validation
- **HTTPS**: Enforced via Cloudflare
- **Content Security**: Proper escaping and sanitization

## 📈 SEO Features

- **Meta Tags**: Complete title, description, and Open Graph tags
- **Structured Data**: JSON-LD for local business and articles
- **XML Sitemap**: Auto-generated sitemap.xml
- **Robots.txt**: Search engine directives
- **Semantic HTML**: Proper heading hierarchy and landmarks

## 🎯 Performance

- **Lighthouse Score**: 95+ across all metrics
- **Image Optimization**: WebP format with fallbacks
- **Code Splitting**: Automatic via Astro
- **Caching**: Optimized for Cloudflare CDN

## 🚀 Deployment

### Cloudflare Pages (Recommended)

1. Push code to Git repository
2. Connect repository to Cloudflare Pages
3. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy automatically on push

### Manual Deployment

1. Run `npm run build`
2. Upload `dist/` folder contents to web server
3. Configure server for SPA routing if needed

## 📞 Support

For technical support or questions about the website:

- **Email**: info@thecommunityobserver.com
- **Phone**: (800) 376-6222

## 📄 License

This project is proprietary to Community Observer. All rights reserved.

---

Build By JimelJ https://github.com/jimelj for the Community Observer newspaper.
