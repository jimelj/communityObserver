// Use dynamic import for pdf-parse since it has ESM issues
// Mark this endpoint as server-rendered (not pre-rendered)
export const prerender = false;

import { writeFile, mkdir, readdir, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

    // IMPORTANT: Create a copy of the buffer BEFORE pdfjs processes it
    // pdfjs will detach the ArrayBuffer, so we need a separate copy for pdfimages
    const pdfBufferCopy = Buffer.from(uint8Array);

    console.log('API: Parsing PDF with pdfjs-dist...');

    // Use pdfjs-dist which is more reliable with ESM
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Load the PDF document (we use pdfimages for image extraction, so no WASM needed)
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    
    console.log('API: PDF loaded successfully');
    console.log('API: Pages:', pdfDocument.numPages);
    
    // Extract text from all pages and track bold line metadata
    let fullText = '';
    const lineRecords = [];
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const linesMap = new Map();
      let pageText = '';
      let lastY = null;

      for (const item of textContent.items) {
        const rawChunk = typeof item.str === 'string' ? item.str : '';
        const textChunk = rawChunk.replace(/\s+/g, ' ').trim();
        if (!textChunk) {
          continue;
        }

        const transform = item.transform;
        const currentY = Array.isArray(transform) && transform.length >= 6 ? transform[5] : null;
        const currentX = Array.isArray(transform) && transform.length >= 6 ? transform[4] : 0;
        const lineKey = currentY === null ? Math.random() : Math.round(currentY / 2) * 2;
        const style = textContent.styles?.[item.fontName];
        const fontName = item.fontName || '';
        const fontFamily = style?.fontFamily || '';
        const fontWeight = style?.fontWeight;
        const isBoldChunk = (typeof fontWeight === 'number' && fontWeight >= 600) ||
          (typeof fontWeight === 'string' && parseInt(fontWeight, 10) >= 600) ||
          /bold|black|heavy|demi/iu.test(fontName) ||
          /bold|black|heavy|demi/iu.test(fontFamily);

        if (!linesMap.has(lineKey)) {
          linesMap.set(lineKey, {
            items: [],
            hasBold: false,
            y: currentY ?? 0
          });
        }
        const lineEntry = linesMap.get(lineKey);
        lineEntry.items.push({ text: rawChunk, x: currentX });
        if (isBoldChunk) {
          lineEntry.hasBold = true;
        }

        if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 6) {
          pageText = pageText.trimEnd() + '\n';
        }

        pageText += textChunk;

        if (item.hasEOL) {
          pageText += '\n';
          lastY = null;
        } else {
          pageText += ' ';
          lastY = currentY;
        }
      }

      for (const entry of Array.from(linesMap.values()).sort((a, b) => b.y - a.y)) {
        const lineText = entry.items
          .sort((a, b) => a.x - b.x)
          .map((part) => part.text)
          .join('')
          .replace(/\s+/g, ' ')
          .trim();
        if (lineText) {
          lineRecords.push({
            text: lineText,
            hasBold: entry.hasBold,
            page: pageNum,
            y: entry.y
          });
        }
      }

      pageText = pageText
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim();

      fullText += pageText + '\n\n';
    }

    fullText = fullText
      .replace(/-\s*\n\s*/g, '')
      .replace(/\n{3,}/g, '\n\n');

    console.log('API: Text extracted successfully');
    console.log('API: Text length:', fullText.length);
    console.log('API: First 500 characters:', fullText.substring(0, 500));

    // Extract images if requested
    const extractImages = formData.get('extractImages') === 'on';
    let extractedImages = [];

    if (extractImages) {
      console.log('API: Extracting images from PDF...');
      // Use the pre-saved copy (pdfBufferCopy was created before pdfjs detached the ArrayBuffer)
      extractedImages = await extractImagesFromPDF(pdfDocument, pdfBufferCopy);
      console.log(`API: Extracted ${extractedImages.length} images from PDF`);
    }

    // Split text into potential articles (simple approach for now)
    // We'll look for article titles or sections
    const extractedArticles = extractArticlesFromText(fullText, lineRecords, extractedImages);
    
    console.log('API: Extracted', extractedArticles.length, 'articles from PDF');
    
    return new Response(JSON.stringify({
      success: true,
      articles: extractedArticles,
      extractedImages: extractedImages, // Return all extracted images for manual selection
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

// Images will be manually assigned by the user through the UI
// No automatic image matching

// Helper function to extract articles from PDF text
function extractArticlesFromText(text, lineRecords = [], extractedImages = []) {
  console.log('API: Starting article extraction from text length:', text.length);
  console.log('API: First 2000 characters of PDF text:');
  console.log(text.substring(0, 2000));
  console.log('--- END SAMPLE ---');
  console.log(`API: Available images for articles: ${extractedImages.length}`);

  const articles = [];
  const DEFAULT_AUTHOR = 'Janice Seiferling';

  // Normalize text for headline matching (replace smart quotes with straight quotes)
  const sanitizedText = text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

  const headlineCandidates = new Map();
  const boldHeadlines = new Set(
    lineRecords
      .filter(line => line.hasBold)
      .map(line => line.text.replace(/\s+/g, ' ').trim())
      .filter(line => line.length > 0)
  );
  const boldHeadlinesNormalized = new Set(
    Array.from(boldHeadlines).map(text => normalizeHeadlineText(text))
  );
  const DISALLOWED_HEADLINE_PATTERNS = [
    /^photo\b/i,
    /^photos\b/i,
    /^photo\s+(?:courtesy|by)\b/i,
    /^bookmark\s+design\s+contest/i,
    /^copyright\b/i,
    /^janice\s+seiferling\b/i,
    /^ian\s+daley\b/i,
    /courtesy\s+of/i
  ];

  function cleanHeadline(rawTitle) {
    let title = rawTitle
      .replace(/See\s+[A-Za-z0-9 ,&'"“”()\-]+(?:,?\s*Page\s+\d+)?/gi, '')
      .replace(/\s*\bBy\s+[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*\s*$/gi, '')
      .replace(/\|/g, '')
      .replace(/\s+See$/i, '')
      .replace(/\s*\-\s*/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    if (title.length <= 3) {
      return '';
    }

    const titleLower = title.toLowerCase();
    if (DISALLOWED_HEADLINE_PATTERNS.some((pattern) => pattern.test(titleLower))) {
      return '';
    }

    const wordList = title.split(/\s+/);
    if (wordList.length < 3) {
      const allowTwoWords = wordList.length === 2 && wordList.every(word => word.replace(/[^A-Za-z]/g, '').length >= 4);
      if (!allowTwoWords) {
        return '';
      }
    }

    return title;
  }

  // Helper function to find which page a text index belongs to
  function findPageForTextIndex(textIndex) {
    if (!Array.isArray(lineRecords) || lineRecords.length === 0) {
      return 1; // Default to page 1
    }

    // Find the line record that contains this text position
    let cumulativeLength = 0;
    for (const record of lineRecords) {
      const lineLength = record.text.length + 1; // +1 for newline
      if (textIndex <= cumulativeLength + lineLength) {
        return record.page;
      }
      cumulativeLength += lineLength;
    }

    // If not found, return the last page
    return lineRecords[lineRecords.length - 1].page;
  }

  function addHeadlineCandidate(rawTitle, startIndex, endIndex, meta = {}) {
    const title = cleanHeadline(rawTitle);
    if (!title) {
      return;
    }

    // If page is not provided in meta, try to find it from the text index
    const page = meta.page ?? findPageForTextIndex(startIndex);

    const existing = headlineCandidates.get(title);
    if (!existing || (meta.confidence ?? 0) > (existing.confidence ?? 0)) {
      headlineCandidates.set(title, {
        title,
        index: startIndex,
        endIndex,
        author: meta.author,
        confidence: meta.confidence ?? 1,
        page  // Track which page the headline appears on
      });
      console.log(`API: ✓ Recorded headline candidate: "${title}" (confidence=${meta.confidence ?? 1}, page=${page})`);
    }
  }

  captureHeadlineClustersFromLineRecords();

  // Heuristic: front page headline often appears soon after the issue date
  // Look for pattern like "October 8, 2025" or "September 25, 2025" followed by headline
  const frontHeadlineMatch = sanitizedText.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\s*\n?\s*([A-Z][A-Za-z0-9&'"""()\-\s]{10,120})(?=\s*\n)/);
  if (frontHeadlineMatch) {
    const rawTitle = frontHeadlineMatch[1].trim();
    const relativeIndex = frontHeadlineMatch[0].indexOf(rawTitle);
    const startIndex = frontHeadlineMatch.index + relativeIndex;
    addHeadlineCandidate(rawTitle, startIndex, startIndex + rawTitle.length, { confidence: 3.5 });
    console.log(`API: ✓ Found front-page headline after date: "${rawTitle}"`);
  }

  // Detect byline-driven headlines
  const bylineRegex = /By\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  let bylineMatch;
  while ((bylineMatch = bylineRegex.exec(sanitizedText)) !== null) {
    const bylineIndex = bylineMatch.index;
    const lookbackStart = Math.max(0, bylineIndex - 260);
    let lookback = sanitizedText.substring(lookbackStart, bylineIndex).trim();
    lookback = lookback
      .replace(/See\s+[A-Za-z0-9 ,&'"“”()\-]+(?:,?\s*Page\s+\d+)?/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const headlineMatch = lookback.match(/([A-Z][A-Za-z0-9&'"“”()\-\s]{8,120})\s*$/);
    if (headlineMatch) {
      const rawTitle = headlineMatch[1];
      const startIndex = bylineIndex - rawTitle.length;
      addHeadlineCandidate(rawTitle, startIndex, bylineIndex, {
        confidence: 3,
        author: bylineMatch[1]
      });
    }
  }

  // Detect configured recurring sections - DISABLED to rely on bold detection
  // for (const hint of SECTION_HINTS) {
  //   const regex = createHeadlineRegex(hint);
  //   const match = regex.exec(sanitizedText);
  //   if (match && match[1]) {
  //     const rawTitle = match[1];
  //     const startIndex = match.index + match[0].indexOf(rawTitle);
  //     addHeadlineCandidate(rawTitle, startIndex, startIndex + rawTitle.length, { confidence: 2 });
  //   } else {
  //     console.warn(`API: ⚠️ Headline not found: "${hint}"`);
  //   }
  // }

  // Detect headlines by scanning individual lines
  collectHeadlineCandidatesFromLines();

  // Add common recurring section headlines (not edition-specific)
  const recurringNonBoldHeadlines = [
    'Out & About'
  ];
  
  for (const headline of recurringNonBoldHeadlines) {
    const regex = new RegExp(headline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const match = regex.exec(sanitizedText);
    if (match) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;
      addHeadlineCandidate(match[0], startIndex, endIndex, { confidence: 3.5 });
      console.log(`API: ✓ Found recurring section headline: "${match[0]}"`);
    }
  }

  const foundHeadlines = Array.from(headlineCandidates.values())
    .map(entry => {
      const isBold = boldHeadlines.has(entry.title);
      const confidence = Math.max(entry.confidence ?? 1, isBold ? 2.4 : 0);
      return { ...entry, confidence };
    })
    .filter(entry => entry.confidence >= 2.0);

  if (foundHeadlines.length === 0) {
    console.log('API: No configured headlines were matched. Using fallback chunking.');
    return createArticleChunks(text);
  }

  // Sort headlines by position in the text
  foundHeadlines.sort((a, b) => a.index - b.index);

  // Merge adjacent/split headline fragments into one combined headline
  const mergedHeadlines = [];
  for (let i = 0; i < foundHeadlines.length; i++) {
    let current = { ...foundHeadlines[i] };

    // Special case: merge "Celebrate National" + "Library Card" + "September is National Library" into full title
    if (current.title.toLowerCase().includes('celebrate') && current.title.toLowerCase().includes('national')) {
      let fullTitle = current.title;
      let endIdx = current.endIndex;
      
      // Look ahead for "Library Card" and "September is National Library" parts
      while (i + 1 < foundHeadlines.length) {
        const next = foundHeadlines[i + 1];
        const gap = next.index - endIdx;
        
        if (gap > 200) break; // Too far apart
        
        const nextLower = next.title.toLowerCase();
        if (nextLower.includes('library') || nextLower.includes('card') || nextLower.includes('sign')) {
          fullTitle = `${fullTitle} ${next.title}`.replace(/\s+/g, ' ').trim();
          endIdx = next.endIndex;
          i += 1;
          continue;
        }
        break;
      }
      
      // Clean up the merged title
      fullTitle = fullTitle
        .replace(/Celebrate National\s+Library Card\s+September is National Library/i, 'Celebrate National Library Card Sign-Up Month')
        .replace(/Celebrate National\s+Library Card/i, 'Celebrate National Library Card Sign-Up Month')
        .replace(/September is National Library/i, 'September is National Library Card Sign-Up Month')
        .replace(/Sign-Up Month\s+Sign-Up Month/i, 'Sign-Up Month'); // Remove duplicate
      
      current = {
        ...current,
        title: fullTitle,
        endIndex: endIdx,
        confidence: Math.max(current.confidence, 3.5)
      };
      mergedHeadlines.push(current);
      continue;
    }

    while (i + 1 < foundHeadlines.length) {
      const next = foundHeadlines[i + 1];
      const gap = next.index - current.endIndex;
      const combinedTitle = `${current.title} ${next.title}`.replace(/\s+/g, ' ').trim();

      // Conditions to merge: very small text gap, reasonable total length, looks like a composite title
      const words = combinedTitle.split(/\s+/).length;
      const looksLikeTitle = (() => {
        const metrics = basicLineMetrics(combinedTitle);
        return metrics.titleRatio >= 0.65 || metrics.uppercaseRatio >= 0.55;
      })();

      if (gap >= 0 && gap <= 80 && words <= 18 && looksLikeTitle) {
        current = {
          ...current,
          title: combinedTitle,
          endIndex: next.endIndex,
          confidence: Math.max(current.confidence, next.confidence) + 0.2
        };
        i += 1; // consume next
        continue;
      }
      break;
    }
    mergedHeadlines.push(current);
  }

  // No automatic image assignment - images will be manually selected by user

  for (let i = 0; i < mergedHeadlines.length; i++) {
    const current = mergedHeadlines[i];

    // Skip duplicates (in case the same headline is detected more than once)
    if (articles.some(article => article.title === current.title)) {
      continue;
    }

    const next = mergedHeadlines[i + 1];

    // Determine author by searching for "By ..." immediately after the headline
    const afterHeadline = sanitizedText.substring(current.endIndex, current.endIndex + 200);
    const bylineMatch = afterHeadline.match(/By\s+([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)?(?:\s+[A-Z][a-z]+)+)/);
    const author = current.author || (bylineMatch ? bylineMatch[1] : DEFAULT_AUTHOR);

    const contentStart = current.endIndex + (bylineMatch ? bylineMatch[0].length : 0);
    const contentEnd = next ? next.index : sanitizedText.length;

    let articleContent = sanitizedText.substring(contentStart, contentEnd).trim();

    // Clean up navigation directives and extra whitespace
    articleContent = articleContent
      .replace(/^See\s+[A-Za-z0-9 ,&'“”"-]+Page\s+\d+/i, '')
      .replace(/By\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (articleContent.length < 120) {
      console.log(`API: ✗ Skipped content after "${current.title}" because it was too short (${articleContent.length} chars)`);
      continue;
    }

    console.log(`API: ✓ Article #${articles.length + 1}: "${current.title}" by ${author} (${articleContent.length} chars) [confidence=${current.confidence}]`);

    // No automatic image assignment - user will select manually
    articles.push(createArticleObject({
      title: current.title,
      author,
      content: [articleContent],
      image: null  // Will be assigned manually by user
    }, articles.length));
  }

  console.log(`API: Extracted ${articles.length} configured articles`);

  if (articles.length === 0) {
    console.log('API: No configured articles produced content, using fallback chunking');
    return createArticleChunks(text);
  }

  return articles;

  function collectHeadlineCandidatesFromLines() {
    const lines = sanitizedText.split(/\n+/);
    let searchIndex = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const rawLineOriginal = lines[lineIdx];
      const trimmedFirst = rawLineOriginal.trim();
      if (!trimmedFirst) continue;

      if (!boldHeadlines.has(trimmedFirst) && !isStrongHeadlineSeed(trimmedFirst)) {
        continue;
      }

      const segmentLines = [{ text: rawLineOriginal, trimmed: trimmedFirst }];
      let segmentHasBold = boldHeadlines.has(trimmedFirst);

      let lookahead = lineIdx + 1;
      while (lookahead < lines.length) {
        const rawNext = lines[lookahead];
        const trimmedNext = rawNext.trim();
        if (!trimmedNext) break;

        if (!shouldMergeHeadlineLines(segmentLines[segmentLines.length - 1].trimmed, trimmedNext)) {
          break;
        }

        segmentLines.push({ text: rawNext, trimmed: trimmedNext });
        if (boldHeadlines.has(trimmedNext)) {
          segmentHasBold = true;
        }
        lookahead++;
      }

      if (segmentLines.length > 1) {
        lineIdx += segmentLines.length - 1;
      }

      let accumulatedIndex = -1;
      let startIndex = -1;

      for (const segment of segmentLines) {
        const searchSlice = sanitizedText.slice(searchIndex);
        const deltaIndex = searchSlice.indexOf(segment.trimmed);
        const matchIndex = deltaIndex === -1 ? -1 : searchIndex + deltaIndex;
        if (matchIndex === -1) {
          accumulatedIndex = -1;
          break;
        }

        if (startIndex === -1) {
          startIndex = matchIndex;
        }
        accumulatedIndex = matchIndex + segment.trimmed.length;
        searchIndex = accumulatedIndex;
      }

      if (startIndex === -1) {
        continue;
      }

      const endIndex = accumulatedIndex;

      const normalized = segmentLines
        .map((segment) => segment.trimmed)
        .join(' ')
        .replace(/\s+/g, ' ');

      const analysis = analyzeLineForHeadline(normalized, {
        forceBold: segmentHasBold,
        allowComma: segmentLines.length > 1
      });
      if (!analysis.passes) {
        continue;
      }

      const normalizedKey = normalizeHeadlineText(normalized);
      const confidenceBoost = boldHeadlinesNormalized.has(normalizedKey) || segmentHasBold ? 2.5 : 0;
      const confidence = Math.max(analysis.confidence, confidenceBoost);
      console.log(`API: Line-based headline candidate detected: "${normalized}" (bold=${analysis.isBold || segmentHasBold}, confidence=${confidence.toFixed(2)})`);
      addHeadlineCandidate(normalized, startIndex, endIndex, {
        confidence
      });
    }
  }

  function captureHeadlineClustersFromLineRecords() {
    if (!Array.isArray(lineRecords) || lineRecords.length === 0) return;

    const sortedRecords = [...lineRecords].sort((a, b) => a.page - b.page || b.y - a.y);
    let buffer = [];
    let clusterHasBold = false;
    let searchPointer = 0;

    const finalizeCluster = () => {
      if (!buffer.length) {
        clusterHasBold = false;
        return;
      }

      const candidateText = buffer
        .map((item) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      buffer = [];
      const totalWords = candidateText.split(/\s+/).length;
      if (candidateText.length < 8 || totalWords < 2 || totalWords > 14) {
        clusterHasBold = false;
        return;
      }

      const avgUppercase = clusterStats.totalUppercaseRatio / clusterStats.count;
      const avgTitle = clusterStats.totalTitleRatio / clusterStats.count;

      if ((!clusterHasBold || !firstItemWasBold) && avgUppercase < 0.5 && avgTitle < 0.7) {
        clusterHasBold = false;
        return;
      }

      const escaped = candidateText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = escaped.replace(/\s+/g, '\\s+');
      const regex = new RegExp(pattern);
      const slice = sanitizedText.slice(searchPointer);
      const match = slice.match(regex);
      if (!match) {
        clusterHasBold = false;
        return;
      }

      const startIndex = searchPointer + match.index;
      const endIndex = startIndex + match[0].length;
      searchPointer = endIndex;

      const normalizedCandidate = normalizeHeadlineText(candidateText);
      const confidence = 2.1 + (clusterHasBold ? 1.1 : 0.4) + Math.min(0.7, avgTitle) + Math.min(0.6, avgUppercase) + (boldHeadlinesNormalized.has(normalizedCandidate) ? 0.5 : 0);
      const headlinePage = buffer.length > 0 ? buffer[0].page : 1;  // Get page from first line in cluster
      addHeadlineCandidate(candidateText, startIndex, endIndex, {
        confidence,
        page: headlinePage
      });
      clusterHasBold = false;
    };

    let firstItemWasBold = false;
    const clusterStats = {
      totalUppercaseRatio: 0,
      totalTitleRatio: 0,
      count: 0,
      reset() {
        this.totalUppercaseRatio = 0;
        this.totalTitleRatio = 0;
        this.count = 0;
        firstItemWasBold = false;
      }
    };

    clusterStats.reset();

    for (const record of sortedRecords) {
      const normalized = record.text.replace(/\s+/g, ' ').trim();
      if (!normalized) continue;

      const metrics = basicLineMetrics(normalized);
      const isStrongCandidate = record.hasBold || metrics.uppercaseRatio >= 0.65 || metrics.titleRatio >= 0.75;
      const canExtendCluster = buffer.length > 0 && (metrics.titleRatio >= 0.6 || metrics.uppercaseRatio >= 0.5);

      if (isStrongCandidate || canExtendCluster) {
        buffer.push({ text: normalized, hasBold: record.hasBold, page: record.page });
        if (buffer.length === 1 && record.hasBold) {
          firstItemWasBold = true;
        }
        clusterStats.totalUppercaseRatio += metrics.uppercaseRatio;
        clusterStats.totalTitleRatio += metrics.titleRatio;
        clusterStats.count += 1;
        if (record.hasBold) clusterHasBold = true;
        continue;
      }

      finalizeCluster();
      clusterStats.reset();
    }

    finalizeCluster();
  }

  function analyzeLineForHeadline(textLine, options = {}) {
    const result = {
      passes: false,
      confidence: 0,
      isBold: typeof options.forceBold === 'boolean' ? options.forceBold : boldHeadlines.has(textLine),
      authorHint: undefined
    };

    if (textLine.length < 8 || textLine.length > 140) return result;
    if (/\.$/.test(textLine)) return result;
    const lower = textLine.toLowerCase();
    if (lower.startsWith('see page') || lower.startsWith('page ')) return result;
    if (lower.includes('see page')) return result;
    if (lower === 'community observer') return result;
    if (/^vol\.?/i.test(textLine)) return result;
    if (/^©\s*\d{4}/.test(textLine)) return result;
    if (/^photo\b/i.test(textLine)) return result;
    if (/^sales:\s*/i.test(textLine)) return result;

    const words = textLine.split(/\s+/);
    if (words.length < 3 || words.length > 14) return result;

    const letterCount = textLine.replace(/[^A-Za-z]/g, '').length;
    const uppercaseLetters = textLine.replace(/[^A-Z]/g, '').length;
    const uppercaseRatio = letterCount ? uppercaseLetters / letterCount : 0;

    const titleCaseWords = words.filter(word => /^[A-Z][a-z]+(?:[''][A-Za-z]+)?$/.test(word)).length;
    const allCapsWords = words.filter(word => /^[A-Z]{2,}$/.test(word)).length;
    const titleRatio = words.length ? titleCaseWords / words.length : 0;
    const capsRatio = words.length ? allCapsWords / words.length : 0;

    let confidence = 0;
    if (result.isBold) confidence += 1.8;
    if (uppercaseRatio >= 0.65) confidence += 1.2;
    if (titleRatio >= 0.75) confidence += 1.2;
    if (titleRatio >= 0.65) confidence += 0.6; // More lenient for good title case
    if (capsRatio >= 0.5) confidence += 0.8;
    if (/[0-9]{4}/.test(textLine)) confidence -= 0.5;
    if (!options.allowComma && /[:,]/.test(textLine)) confidence -= 0.2;

    // More lenient threshold when we have good title case
    if (uppercaseRatio < 0.4 && titleRatio < 0.55 && !result.isBold) return result;

    result.passes = confidence >= 1.3;
    result.confidence = confidence;
    return result;
  }

  function basicLineMetrics(textLine) {
    const words = textLine.split(/\s+/);
    const letterCount = textLine.replace(/[^A-Za-z]/g, '').length;
    const uppercaseLetters = textLine.replace(/[^A-Z]/g, '').length;
    const uppercaseRatio = letterCount ? uppercaseLetters / letterCount : 0;
    const titleCaseWords = words.filter(word => /^[A-Z][a-z]+(?:['’][A-Za-z]+)?$/.test(word)).length;
    const titleRatio = words.length ? titleCaseWords / words.length : 0;
    return { uppercaseRatio, titleRatio };
  }

  function normalizeHeadlineText(text) {
    return text
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function shouldMergeHeadlineLines(currentLine, nextLine) {
    if (!nextLine) return false;
    if (/^By\s+/i.test(nextLine)) return false;
    if (/^See\s+/i.test(nextLine)) return false;
    if (/^(Photo|Photos)\b/i.test(nextLine)) return false;
    if (/[.!?]$/.test(currentLine)) return false;
    if (/[.!?]{1}/.test(nextLine) && nextLine.split(/\s+/).length > 6) return false;
    if (nextLine.length > 60) return false;

    const metrics = basicLineMetrics(nextLine);
    if (metrics.titleRatio >= 0.65 || metrics.uppercaseRatio >= 0.55) return true;
    if (/^[A-Z][a-z]+/.test(nextLine) && nextLine.split(/\s+/).length <= 8 && !/[,:]$/.test(nextLine)) {
      return true;
    }

    if (nextLine.length <= 40 && !/[,:]$/.test(nextLine)) {
      return true;
    }

    return false;
  }

  function isStrongHeadlineSeed(line) {
    const metrics = basicLineMetrics(line);
    if (metrics.titleRatio >= 0.8 || metrics.uppercaseRatio >= 0.65) return true;
    const words = line.split(/\s+/).length;
    if (words <= 6 && /^[A-Z]/.test(line) && !/[,:]$/.test(line)) return true;
    return false;
  }
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
  const titleLower = articleData.title.toLowerCase();
  let category = 'community';

  if (contentLower.includes('sport') || contentLower.includes('game') || contentLower.includes('team') || contentLower.includes('basketball') || contentLower.includes('hoops')) {
    category = 'sports';
  } else if (contentLower.includes('business') || titleLower.includes('business') || contentLower.includes('company') || contentLower.includes('economic')) {
    category = 'business';
  } else if (contentLower.includes('council') || contentLower.includes('government') || contentLower.includes('mayor')) {
    category = 'government';
  } else if (contentLower.includes('school') || contentLower.includes('student') || contentLower.includes('education') || contentLower.includes('library')) {
    category = 'education';
  } else if (titleLower.includes('out & about') || titleLower.includes('jazz') || titleLower.includes('festival') || contentLower.includes('theater') || contentLower.includes('music')) {
    category = 'events';
  }

  // Use extracted image if available, otherwise use placeholder
  const imagePath = articleData.image ? articleData.image.path : '/images/placeholder-council.jpg';

  return {
    id: `extracted-article-${index + 1}`,
    title: articleData.title,
    description: description,
    date: new Date().toISOString().split('T')[0],
    author: articleData.author || 'Janice Seiferling',  // Default to Janice
    category: category,
    tags: [category, 'local', 'news'],
    image: imagePath,
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

const SECTION_HINTS = [
  'Cheesequake hosts new training to Old Bridge',
  'Welcome to your hometown newspaper',
  "Celebrate National Library Card Sign-Up Month",
  "Who's your local hero?",
  'Natya Darpan marks decade of multilingual theater',
  'Out & About',
  'Business Briefs',
  'Hoops Tourney benefits scholarship fund',
  'Jazz Festival swings into action as women, students take the stage'
];

function createHeadlineRegex(title) {
  const words = title.trim().split(/\s+/);

  const wordPatterns = words.map((word) => {
    const chars = Array.from(word);
    const charPatterns = chars.map((ch) => {
      if (/[A-Za-z0-9]/.test(ch)) {
        return `${ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\s-]*`;
      }
      if (ch === '&') {
        return '(?:&|and)[\s-]*';
      }
      if (ch === "'") {
        return "(?:['''])[\s-]*";
      }
      if (ch === ',') {
        return ',?[\s-]*';
      }
      if (ch === '.') {
        return '\\.?[\s-]*';
      }
      if (ch === '?') {
        return '\\?';
      }
      if (ch === '"' || ch === '"' || ch === '"') {
        return '(?:["""])[\s-]*';
      }
      if (ch === '-') {
        return '[\s-]*';
      }
      return `${ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\s-]*`;
    });
    return charPatterns.join('');
  });

  const pattern = wordPatterns.join('[\s-]+');

  return new RegExp(`(${pattern})`, 'i');
}

// Function to extract images from PDF
async function extractImagesFromPDF(pdfDocument, uint8Array) {
  const extractedImages = [];
  const outputDir = join(process.cwd(), 'public', 'images', 'extracted');
  const tempDir = join(process.cwd(), 'temp-pdf-extract');

  // Ensure directories exist
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
    console.log('API: Created images/extracted directory');
  }

  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true });
  }

  try {
    // Save PDF to temporary file for pdfimages to process
    const timestamp = Date.now();
    const tempPdfPath = join(tempDir, `temp-${timestamp}.pdf`);
    const imagePrefix = join(tempDir, `img-${timestamp}`);

    await writeFile(tempPdfPath, uint8Array);
    console.log('API: Saved temporary PDF for image extraction');

    // Use pdfimages to extract all images (including JPEG2000)
    // -png: convert all images to PNG format
    // -p: include page numbers in filenames
    const pdfimagesCmd = `pdfimages -png -p "${tempPdfPath}" "${imagePrefix}"`;

    console.log('API: Running pdfimages to extract images...');
    await execAsync(pdfimagesCmd);

    // Read all extracted images from temp directory
    const files = await readdir(tempDir);
    const imageFiles = files.filter(f => f.startsWith(`img-${timestamp}`) && f.endsWith('.png'));

    console.log(`API: Found ${imageFiles.length} extracted images`);

    // Process each extracted image
    let imageCounter = 0;
    for (const imageFile of imageFiles) {
      const tempImagePath = join(tempDir, imageFile);

      // Parse page number from filename (format: img-TIMESTAMP-PAGENUM-IMGNUM.png)
      const match = imageFile.match(/img-\d+-(\d+)-\d+\.png/);
      const pageNum = match ? parseInt(match[1]) : 1;

      // Read image to get dimensions and copy to final location
      const imageBuffer = await readFile(tempImagePath);
      const finalFilename = `article-page${pageNum}-${timestamp}-${imageCounter}.png`;
      const finalPath = join(outputDir, finalFilename);
      const webPath = `/images/extracted/${finalFilename}`;

      await writeFile(finalPath, imageBuffer);
      console.log(`API: Extracted image from page ${pageNum}: ${finalFilename} (${imageBuffer.length} bytes)`);

      extractedImages.push({
        page: pageNum,
        name: imageFile,
        path: webPath,
        size: imageBuffer.length
      });

      // Clean up temp image
      await unlink(tempImagePath);
      imageCounter++;
    }

    // Clean up temporary PDF
    await unlink(tempPdfPath);

    console.log(`API: Successfully extracted ${extractedImages.length} images using pdfimages`);
  } catch (error) {
    console.error('API: Error extracting images with pdfimages:', error);
  }

  return extractedImages;
}

// Simple PNG encoder (for basic RGB/RGBA data)
async function createPNGBuffer(imageData, width, height, kind = null) {
  try {
    // Try to use node-canvas
    const { createCanvas } = await import('canvas').catch(() => null);

    if (createCanvas) {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(width, height);

      // pdfjs-dist images can be in different formats:
      // - RGB (3 bytes per pixel)
      // - RGBA (4 bytes per pixel)
      // - Grayscale (1 byte per pixel)

      const bytesPerPixel = imageData.length / (width * height);

      console.log(`API: Image format - width: ${width}, height: ${height}, bytesPerPixel: ${bytesPerPixel}, kind: ${kind}`);

      if (bytesPerPixel === 4) {
        // RGBA format - direct copy
        for (let i = 0; i < imageData.length; i++) {
          imgData.data[i] = imageData[i];
        }
      } else if (bytesPerPixel === 3) {
        // RGB format - need to add alpha channel
        let j = 0;
        for (let i = 0; i < imageData.length; i += 3) {
          imgData.data[j++] = imageData[i];     // R
          imgData.data[j++] = imageData[i + 1]; // G
          imgData.data[j++] = imageData[i + 2]; // B
          imgData.data[j++] = 255;               // A (fully opaque)
        }
      } else if (bytesPerPixel === 1) {
        // Grayscale - convert to RGBA
        let j = 0;
        for (let i = 0; i < imageData.length; i++) {
          const gray = imageData[i];
          imgData.data[j++] = gray; // R
          imgData.data[j++] = gray; // G
          imgData.data[j++] = gray; // B
          imgData.data[j++] = 255;  // A
        }
      } else {
        console.warn(`API: Unexpected bytes per pixel: ${bytesPerPixel}`);
        // Try direct copy as fallback
        for (let i = 0; i < Math.min(imageData.length, imgData.data.length); i++) {
          imgData.data[i] = imageData[i];
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas.toBuffer('image/png');
    }
  } catch (e) {
    console.error('API: Canvas error:', e);
  }

  // Fallback: return raw data (likely won't be a valid PNG)
  console.warn('API: Using fallback - image may be corrupted');
  return Buffer.from(imageData);
}
