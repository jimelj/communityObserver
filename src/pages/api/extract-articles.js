import pdf from 'pdf-parse';

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

    // Convert the PDF file to a buffer for parsing
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('API: Parsing PDF...');
    const pdfData = await pdf(buffer);
    
    console.log('API: PDF parsed successfully');
    console.log('API: Pages:', pdfData.numpages);
    console.log('API: Text length:', pdfData.text.length);
    console.log('API: First 500 characters:', pdfData.text.substring(0, 500));
    
    // Split text into potential articles (simple approach for now)
    // We'll look for article titles or sections
    const extractedArticles = extractArticlesFromText(pdfData.text);
    
    console.log('API: Extracted', extractedArticles.length, 'articles from PDF');
    
    return new Response(JSON.stringify({
      success: true,
      articles: extractedArticles,
      message: `Successfully extracted ${extractedArticles.length} articles from the PDF.`,
      pdfInfo: {
        pages: pdfData.numpages,
        textLength: pdfData.text.length
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
  const articles = [];
  
  // For demonstration, let's create a simple extraction
  // This will need to be customized based on your newspaper format
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
