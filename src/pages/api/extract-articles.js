// Use dynamic import for pdf-parse since it has ESM issues
// Mark this endpoint as server-rendered (not pre-rendered)
export const prerender = false;

export async function POST({ request }) {
  try {
    console.log('API: Received POST request to extract-articles');
    console.log('API: Content-Type:', request.headers.get('content-type'));
    
    let formData;
    try {
      formData = await request.formData();
      console.log('API: FormData parsed successfully');
    } catch (parseError) {
      console.error('API: Error parsing FormData:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse form data. Please try again.',
        details: parseError.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const pdfFile = formData.get('pdfFile');
    
    console.log('API: PDF file received:', pdfFile ? {
      name: pdfFile.name,
      type: pdfFile.type,
      size: pdfFile.size
    } : 'No file');
    
    if (!pdfFile) {
      console.log('API: No file provided');
      return new Response(JSON.stringify({
        success: false,
        error: 'Please upload a valid PDF file.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if it's a PDF by type or name
    const isPDF = pdfFile.type === 'application/pdf' || pdfFile.name.toLowerCase().endsWith('.pdf');
    
    if (!isPDF) {
      console.log('API: File is not a PDF');
      return new Response(JSON.stringify({
        success: false,
        error: 'Please upload a valid PDF file.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('API: PDF file validated successfully');

    // Convert the PDF file to a Uint8Array for pdfjs-dist
    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('API: Parsing PDF with pdfjs-dist...');
    
    // Use pdfjs-dist which is more reliable with ESM
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    console.log('API: PDF loaded successfully');
    console.log('API: Pages:', pdfDocument.numPages);
    
    // Extract text from all pages
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    
    console.log('API: Text extracted successfully');
    console.log('API: Text length:', fullText.length);
    console.log('API: First 500 characters:', fullText.substring(0, 500));
    
    // Split text into potential articles (simple approach for now)
    // We'll look for article titles or sections
    const extractedArticles = extractArticlesFromText(fullText);
    
    console.log('API: Extracted', extractedArticles.length, 'articles from PDF');
    
    return new Response(JSON.stringify({
      success: true,
      articles: extractedArticles,
      message: `Successfully extracted ${extractedArticles.length} articles from the PDF.`,
      pdfInfo: {
        pages: pdfDocument.numPages,
        textLength: fullText.length
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('PDF extraction error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({
      success: false,
      error: 'An error occurred while processing the PDF.',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper function to extract articles from PDF text
function extractArticlesFromText(text) {
  console.log('API: Starting article extraction from text length:', text.length);
  console.log('API: First 1500 characters of PDF text:');
  console.log(text.substring(0, 1500));
  console.log('--- END SAMPLE ---');

  const articles = [];

  // GENERIC NEWSPAPER PATTERN DETECTION
  // Works for any newspaper by looking for common patterns

  // 1. Look for author bylines (most reliable pattern)
  // Match "By Author Name" or "By: Author Name" or "Written by Author Name"
  const bylinePattern = /(?:By|Written by|Author)[\s:]+([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+)*)/gi;
  const bylineMatches = [...text.matchAll(bylinePattern)];

  console.log('API: Found', bylineMatches.length, 'author bylines');
  if (bylineMatches.length > 0) {
    console.log('API: Sample bylines:', bylineMatches.slice(0, 3).map(m => m[0]));
  }

  // Extract articles around bylines first (most reliable)
  for (let i = 0; i < bylineMatches.length && articles.length < 8; i++) {
    const bylineMatch = bylineMatches[i];
    const author = bylineMatch[1];

    // Get text before byline to find title
    const textBeforeByline = text.substring(0, bylineMatch.index);
    const sentences = textBeforeByline.split(/[.!?]/).filter(s => s.trim().length > 15);

    let title = null;
    if (sentences.length > 0) {
      const lastSentence = sentences[sentences.length - 1].trim();
      if (lastSentence.length >= 15 && lastSentence.length <= 120) {
        title = lastSentence;
      }
    }

    if (!title) {
      title = `Article by ${author}`;
    }

    // Extract content after byline until next byline or major section break
    const contentStart = bylineMatch.index + bylineMatch[0].length;
    const nextByline = bylineMatches[i + 1];
    const contentEnd = nextByline ? nextByline.index : text.length;
    const articleContent = text.substring(contentStart, contentEnd).trim();

    // Clean up content (remove any remaining bylines)
    const cleanContent = articleContent.replace(/By\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, '').trim();

    if (cleanContent.length > 200) {
      console.log(`API: Found article "${title}" by ${author} (${cleanContent.length} chars)`);
      articles.push(createArticleObject({
        title: title,
        author: author,
        content: [cleanContent]
      }, articles.length));
    }
  }

  // 2. Look for capitalized titles (newspaper headlines)
  // Match lines that start with capital letters and contain mostly title case
  const titlePattern = /([A-Z][A-Za-z\s,':&-]{14,150}?)(?=[\n\r]|By\s|$)/g;
  const titleMatches = [...text.matchAll(titlePattern)];

  // Filter out navigation, dates, and common non-article phrases
  const filteredTitles = titleMatches.filter(match => {
    const title = match[1].trim();
    
    // Exclude common non-article patterns
    const excludePatterns = [
      /^(Find|Network|Scat|See Page|Page|Photo|VOL|Email|Phone|Address|Website)/i,
      /^(January|February|March|April|May|June|July|August|September|October|November|December)/i,
      /^\d+$/,  // Just numbers
      /^www\./,  // URLs
      /Community Observer/i,  // Newspaper name
      /^\s*$/  // Empty or whitespace
    ];
    
    // Check if title matches any exclude pattern
    for (const pattern of excludePatterns) {
      if (pattern.test(title)) {
        return false;
      }
    }
    
    // Must be reasonable length
    return title.length >= 15 && title.length <= 150;
  });

  console.log('API: Found', filteredTitles.length, 'potential article titles');
  if (filteredTitles.length > 0) {
    console.log('API: Sample titles:', filteredTitles.slice(0, 5).map(m => m[1].trim()));
  }

  // Extract articles around standalone titles
  for (let i = 0; i < filteredTitles.length && articles.length < 12; i++) {
    const titleMatch = filteredTitles[i];
    const title = titleMatch[1].trim();

    // Skip if already extracted as part of byline article
    if (articles.some(article => article.title === title)) {
      continue;
    }

    // Extract content after title
    const contentStart = titleMatch.index + titleMatch[0].length;
    const nextTitle = filteredTitles[i + 1];
    const contentEnd = nextTitle ? nextTitle.index : text.length;
    const articleContent = text.substring(contentStart, contentEnd).trim();

    if (articleContent.length > 200) {
      console.log(`API: Found article "${title}" (${articleContent.length} chars)`);
      articles.push(createArticleObject({
        title: title,
        author: 'Newspaper Staff',
        content: [articleContent]
      }, articles.length));
    }
  }

  // 3. Look for section headers (like "Out & About", "Business Briefs")
  const sectionPatterns = [
    /Out & About/g,
    /Business Briefs/g,
    /Sports Briefs/g,
    /Local News/g,
    /Community News/g,
    /Features/g,
    /Opinion/g,
    /Editorial/g
  ];

  for (const pattern of sectionPatterns) {
    if (articles.length >= 15) break; // Limit total articles

    const matches = [...text.matchAll(pattern)];
    console.log(`API: Found`, matches.length, `matches for ${pattern.source}`);

    for (const match of matches) {
      if (articles.length >= 15) break;

      const sectionTitle = match[0];
      const sectionIndex = match.index;
      const sectionContent = text.substring(sectionIndex + sectionTitle.length).trim();

      // Find where this section ends (look for next section or end)
      const nextSectionBreak = sectionContent.indexOf('By ') ||
                              sectionContent.indexOf(sectionTitle) ||
                              sectionContent.length;

      const sectionArticleContent = nextSectionBreak > 0 ?
        sectionContent.substring(0, nextSectionBreak).trim() :
        sectionContent.substring(0, Math.min(sectionContent.length, 1000)).trim();

      if (sectionArticleContent.length > 200) {
        console.log(`API: Found section "${sectionTitle}" (${sectionArticleContent.length} chars)`);
        articles.push(createArticleObject({
          title: sectionTitle,
          author: 'Newspaper Staff',
          content: [sectionArticleContent]
        }, articles.length));
      }
    }
  }

  console.log('API: Found', articles.length, 'articles total');

  // If we didn't find enough articles, fall back to chunking
  if (articles.length < 3) {
    console.log('API: Not enough articles found, using fallback chunking');
    return createArticleChunks(text);
  }

  return articles;
}


// Helper to identify header/footer elements (kept for fallback chunking)
function isHeaderFooter(line) {
  return line.match(/^(Page\s+\d+|VOL\.|www\.|Email|Phone|Copyright|©|\d{4}|September|October|November|Community Observer)/) ||
         line.match(/^\d+$/) ||
         line.length < 3;
}

function createArticleObject(articleData, index) {
  const fullText = articleData.content.join(' ').trim();
  const words = fullText.split(/\s+/);
  const description = words.slice(0, 30).join(' ') + (words.length > 30 ? '...' : '');
  
  // Try to detect category from content
  const contentLower = fullText.toLowerCase();
  let category = 'community';
  if (contentLower.includes('sport') || contentLower.includes('game') || contentLower.includes('team')) {
    category = 'sports';
  } else if (contentLower.includes('business') || contentLower.includes('company') || contentLower.includes('economic')) {
    category = 'business';
  } else if (contentLower.includes('council') || contentLower.includes('government') || contentLower.includes('mayor')) {
    category = 'government';
  } else if (contentLower.includes('school') || contentLower.includes('student') || contentLower.includes('education')) {
    category = 'education';
  }
  
  return {
    id: `extracted-article-${index + 1}`,
    title: articleData.title,
    description: description,
    date: new Date().toISOString().split('T')[0],
    author: articleData.author || 'Community Observer',
    category: category,
    tags: [category, 'local', 'news'],
    image: '/images/placeholder-council.jpg',
    featured: index === 0,
    content: [
      {
        type: 'paragraph',
        class: 'lead',
        text: words.slice(0, 50).join(' ') + (words.length > 50 ? '...' : '')
      },
      {
        type: 'paragraph',
        text: fullText
      }
    ],
    wordCount: words.length
  };
}

function createArticleChunks(text) {
  // Fallback: split text into chunks of roughly 500 words each
  const words = text.split(/\s+/);
  const chunkSize = 500;
  const chunks = [];
  
  for (let i = 0; i < words.length && chunks.length < 10; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    const chunkText = chunk.join(' ');
    
    // Try to find a sentence end near the chunk boundary
    const lastPeriod = chunkText.lastIndexOf('.');
    const actualChunk = lastPeriod > chunkSize * 0.7 ? chunkText.substring(0, lastPeriod + 1) : chunkText;
    
    chunks.push({
      id: `extracted-chunk-${chunks.length + 1}`,
      title: `Article ${chunks.length + 1} from PDF`,
      description: chunk.slice(0, 20).join(' ') + '...',
      date: new Date().toISOString().split('T')[0],
      author: 'Community Observer',
      category: 'community',
      tags: ['extracted', 'pdf'],
      image: '/images/placeholder-council.jpg',
      featured: chunks.length === 0,
      content: [
        {
          type: 'paragraph',
          text: actualChunk
        }
      ],
      wordCount: chunk.length
    });
  }
  
  return chunks;
}

// Keep some sample articles for reference
function getSampleArticles() {
  const mockArticles = [
      {
        id: 'extracted-article-1',
        title: 'Local Business Expansion Brings New Jobs',
        description: 'A popular local restaurant announces plans to open a second location, creating 25-30 new employment opportunities.',
        date: new Date().toISOString().split('T')[0],
        author: 'Community Reporter',
        category: 'business',
        tags: ['business', 'jobs', 'economy'],
        image: '/images/placeholder-restaurant.jpg',
        featured: false,
        content: [
          {
            type: 'paragraph',
            class: 'lead',
            text: 'The community is buzzing with excitement as Maria\'s Family Kitchen, a beloved local restaurant, announced plans to expand with a second location on the east side of town.'
          },
          {
            type: 'paragraph',
            text: 'The new restaurant will be located in the renovated Eastside Shopping Plaza and is expected to open in early 2026. This expansion represents a significant investment in the local economy and will create numerous job opportunities for residents.'
          },
          {
            type: 'heading',
            level: 2,
            text: 'Job Creation Impact'
          },
          {
            type: 'paragraph',
            text: 'The expansion is expected to create 25-30 new jobs, including positions for kitchen staff, servers, and management. Owner Maria Rodriguez emphasized their commitment to hiring locally and providing competitive benefits.'
          }
        ],
        wordCount: 156
      },
      {
        id: 'extracted-article-2',
        title: 'Community Center Receives Major Renovation Grant',
        description: 'The city council approved a $500,000 grant for comprehensive renovations to the community center.',
        date: new Date().toISOString().split('T')[0],
        author: 'City Reporter',
        category: 'community',
        tags: ['community', 'renovation', 'grants'],
        image: '/images/placeholder-council.jpg',
        featured: false,
        content: [
          {
            type: 'paragraph',
            class: 'lead',
            text: 'The Old Bridge Township Community Center is set to receive a major facelift following the approval of a $500,000 renovation grant by the city council.'
          },
          {
            type: 'paragraph',
            text: 'The grant will fund improvements to the building\'s infrastructure, accessibility features, and modern amenities. Construction is expected to begin in the spring of 2025.'
          }
        ],
        wordCount: 89
      },
      {
        id: 'extracted-article-3',
        title: 'Youth Soccer League Championship Results',
        description: 'The Under-14 team secured their first championship title in a thrilling final match.',
        date: new Date().toISOString().split('T')[0],
        author: 'Sports Reporter',
        category: 'sports',
        tags: ['sports', 'youth', 'championship'],
        image: '/images/placeholder-sports.jpg',
        featured: true,
        content: [
          {
            type: 'paragraph',
            class: 'lead',
            text: 'The Old Bridge Youth Soccer League Under-14 team made history last weekend by winning their first championship title in a nail-biting final match.'
          },
          {
            type: 'paragraph',
            text: 'The team, coached by local resident Mike Johnson, defeated the defending champions 3-2 in overtime. The victory marks the culmination of a season of hard work and dedication.'
          }
        ],
        wordCount: 78
      }
    ];

    // Add the actual PDF text as the first article for now
    // You can manually review and split it into proper articles
    const pdfTextArticle = {
      id: 'pdf-extracted-text',
      title: 'Extracted PDF Content (needs formatting)',
      description: 'Raw text extracted from the PDF. Please review and format into proper articles.',
      date: new Date().toISOString().split('T')[0],
      author: 'PDF Extraction',
      category: 'extracted',
      tags: ['pdf', 'extracted', 'raw'],
      image: '/images/placeholder-council.jpg',
      featured: false,
      content: [
        {
          type: 'paragraph',
          class: 'lead',
          text: 'This is the raw text extracted from your PDF. You can use this to manually create articles or we can implement AI-based article detection.'
        },
        {
          type: 'paragraph',
          text: text.substring(0, 2000) + (text.length > 2000 ? '...' : '')
        }
      ],
      wordCount: text.split(/\s+/).length,
      fullText: text // Include full text for reference
    };
    
    return [pdfTextArticle, ...mockArticles];
}
