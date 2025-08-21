import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function getAllArticles() {
  const articlesDir = join(process.cwd(), 'src/data/articles');
  
  try {
    const files = await readdir(articlesDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    const articles = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = join(articlesDir, file);
        const raw = await readFile(filePath, 'utf-8');
        const article = JSON.parse(raw);
        
        // Add href for navigation
        article.href = `/articles/${article.id}`;
        
        // Use excerpt as description if not provided
        if (!article.description && article.excerpt) {
          article.description = article.excerpt;
        }
        
        return article;
      })
    );
    
    // Sort by date (newest first)
    return articles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error loading articles:', error);
    return [];
  }
}

export async function getFeaturedArticle() {
  const articles = await getAllArticles();
  return articles.find(article => article.featured) || null;
}

export async function getRegularArticles() {
  const articles = await getAllArticles();
  return articles.filter(article => !article.featured);
}

export function getUniqueCategories(articles) {
  return [...new Set(articles.map(article => article.category))];
}

