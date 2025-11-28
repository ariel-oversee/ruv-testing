/**
 * AI Knowledge Nexus - Live Web Scraper
 *
 * Multi-source web scraping system with:
 * - Smart content extraction
 * - Ethical scraping practices
 * - Rate limiting and politeness
 * - Content deduplication
 * - Automatic chunking
 * - Distributed coordination
 *
 * @module LiveScraper
 */

import EventEmitter from 'events';
import crypto from 'crypto';
import { setTimeout as sleep } from 'timers/promises';

/**
 * Configuration for scraping sources
 */
const SCRAPER_CONFIG = {
  // Rate limiting (requests per minute)
  rateLimits: {
    default: 10,
    arxiv: 5,
    pubmed: 3,
    github: 30,
    youtube: 20,
    wikipedia: 20,
    news: 15
  },

  // Politeness delays (milliseconds)
  delays: {
    default: 1000,
    respectful: 2000,
    aggressive: 500
  },

  // User agents for ethical scraping
  userAgents: [
    'AI-Knowledge-Nexus/1.0 (Educational; +https://github.com/ai-knowledge-nexus)',
    'Mozilla/5.0 (compatible; KnowledgeBot/1.0; +https://ai-knowledge-nexus.org)',
  ],

  // Content chunk sizes (tokens)
  chunkSizes: {
    small: 512,
    medium: 1024,
    large: 2048,
    xlarge: 4096
  },

  // Source-specific configurations
  sources: {
    arxiv: {
      baseUrl: 'https://arxiv.org',
      apiUrl: 'https://export.arxiv.org/api/query',
      rateLimit: 5,
      delay: 3000
    },
    pubmed: {
      baseUrl: 'https://pubmed.ncbi.nlm.nih.gov',
      apiUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
      rateLimit: 3,
      delay: 2000
    },
    github: {
      baseUrl: 'https://github.com',
      apiUrl: 'https://api.github.com',
      rateLimit: 30,
      delay: 1000
    },
    youtube: {
      baseUrl: 'https://youtube.com',
      apiUrl: 'https://www.googleapis.com/youtube/v3',
      rateLimit: 20,
      delay: 1000
    },
    wikipedia: {
      baseUrl: 'https://en.wikipedia.org',
      apiUrl: 'https://en.wikipedia.org/w/api.php',
      rateLimit: 20,
      delay: 1000
    }
  }
};

/**
 * Rate limiter for ethical scraping
 */
class RateLimiter {
  constructor(requestsPerMinute = 10) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
    this.queue = [];
  }

  async acquire() {
    const now = Date.now();

    // Remove old requests (older than 1 minute)
    this.requests = this.requests.filter(time => now - time < 60000);

    // Check if we can make a request
    if (this.requests.length < this.requestsPerMinute) {
      this.requests.push(now);
      return;
    }

    // Wait for the oldest request to expire
    const oldestRequest = this.requests[0];
    const waitTime = 60000 - (now - oldestRequest);
    await sleep(waitTime + 100);

    // Try again
    return this.acquire();
  }

  reset() {
    this.requests = [];
  }
}

/**
 * Content deduplicator using cryptographic hashing
 */
class ContentDeduplicator {
  constructor() {
    this.seenHashes = new Set();
    this.contentCache = new Map();
  }

  hash(content) {
    // Normalize content for comparison
    const normalized = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    return crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex');
  }

  isDuplicate(content) {
    const hash = this.hash(content);

    if (this.seenHashes.has(hash)) {
      return true;
    }

    this.seenHashes.add(hash);
    return false;
  }

  addContent(content, metadata = {}) {
    const hash = this.hash(content);
    this.seenHashes.add(hash);
    this.contentCache.set(hash, {
      content,
      metadata,
      timestamp: Date.now()
    });
  }

  getSimilar(content, threshold = 0.8) {
    // Simple similarity check using Jaccard similarity
    const words1 = new Set(content.toLowerCase().split(/\s+/));

    const similar = [];
    for (const [hash, cached] of this.contentCache.entries()) {
      const words2 = new Set(cached.content.toLowerCase().split(/\s+/));

      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);

      const similarity = intersection.size / union.size;

      if (similarity >= threshold) {
        similar.push({
          ...cached,
          similarity,
          hash
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity);
  }

  clear() {
    this.seenHashes.clear();
    this.contentCache.clear();
  }

  size() {
    return this.seenHashes.size;
  }
}

/**
 * Content chunker with smart splitting strategies
 */
class ContentChunker {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || SCRAPER_CONFIG.chunkSizes.medium;
    this.overlap = options.overlap || 128;
    this.strategy = options.strategy || 'sentence';
  }

  chunk(content, metadata = {}) {
    switch (this.strategy) {
      case 'sentence':
        return this.chunkBySentence(content, metadata);
      case 'paragraph':
        return this.chunkByParagraph(content, metadata);
      case 'semantic':
        return this.chunkSemantic(content, metadata);
      case 'fixed':
      default:
        return this.chunkFixed(content, metadata);
    }
  }

  chunkFixed(content, metadata) {
    const chunks = [];
    const words = content.split(/\s+/);

    for (let i = 0; i < words.length; i += this.chunkSize - this.overlap) {
      const chunk = words.slice(i, i + this.chunkSize).join(' ');

      chunks.push({
        content: chunk,
        metadata: {
          ...metadata,
          chunkIndex: chunks.length,
          totalChunks: Math.ceil(words.length / (this.chunkSize - this.overlap)),
          strategy: 'fixed',
          size: chunk.split(/\s+/).length
        }
      });
    }

    return chunks;
  }

  chunkBySentence(content, metadata) {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);

      if (currentSize + words.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join(' '),
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            strategy: 'sentence',
            size: currentSize
          }
        });

        // Add overlap
        currentChunk = currentChunk.slice(-Math.floor(this.overlap / 10));
        currentSize = currentChunk.reduce((sum, s) => sum + s.split(/\s+/).length, 0);
      }

      currentChunk.push(sentence.trim());
      currentSize += words.length;
    }

    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join(' '),
        metadata: {
          ...metadata,
          chunkIndex: chunks.length,
          strategy: 'sentence',
          size: currentSize
        }
      });
    }

    // Update total chunks
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  chunkByParagraph(content, metadata) {
    const paragraphs = content.split(/\n\n+/);
    const chunks = [];
    let currentChunk = [];
    let currentSize = 0;

    for (const paragraph of paragraphs) {
      const words = paragraph.trim().split(/\s+/);

      if (currentSize + words.length > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join('\n\n'),
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            strategy: 'paragraph',
            size: currentSize
          }
        });

        currentChunk = [];
        currentSize = 0;
      }

      currentChunk.push(paragraph.trim());
      currentSize += words.length;
    }

    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n\n'),
        metadata: {
          ...metadata,
          chunkIndex: chunks.length,
          strategy: 'paragraph',
          size: currentSize
        }
      });
    }

    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  chunkSemantic(content, metadata) {
    // Simplified semantic chunking based on topic boundaries
    // In production, this would use NLP techniques
    const sections = content.split(/\n#{1,3}\s+/); // Split on markdown headers
    const chunks = [];

    for (const section of sections) {
      if (section.trim().length === 0) continue;

      const words = section.trim().split(/\s+/);

      if (words.length <= this.chunkSize) {
        chunks.push({
          content: section.trim(),
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            strategy: 'semantic',
            size: words.length
          }
        });
      } else {
        // Split large sections using sentence strategy
        const subChunks = this.chunkBySentence(section, metadata);
        chunks.push(...subChunks);
      }
    }

    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }
}

/**
 * Metadata extractor for various content types
 */
class MetadataExtractor {
  extractFromHTML(html, url) {
    const metadata = {
      url,
      extractedAt: new Date().toISOString(),
      contentType: 'html'
    };

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) metadata.title = titleMatch[1].trim();

    // Extract meta tags
    const metaTags = html.match(/<meta[^>]+>/gi) || [];
    for (const tag of metaTags) {
      const nameMatch = tag.match(/name=["']([^"']+)["']/i);
      const contentMatch = tag.match(/content=["']([^"']+)["']/i);
      const propertyMatch = tag.match(/property=["']([^"']+)["']/i);

      if ((nameMatch || propertyMatch) && contentMatch) {
        const key = (nameMatch?.[1] || propertyMatch?.[1]).toLowerCase();
        metadata[key] = contentMatch[1];
      }
    }

    // Extract structured data (JSON-LD)
    const jsonLdMatch = html.match(/<script type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi);
    if (jsonLdMatch) {
      try {
        metadata.structuredData = jsonLdMatch.map(script => {
          const json = script.replace(/<script[^>]*>|<\/script>/gi, '');
          return JSON.parse(json);
        });
      } catch (e) {
        // Invalid JSON-LD
      }
    }

    // Extract Open Graph data
    const ogTags = {};
    for (const tag of metaTags) {
      const propertyMatch = tag.match(/property=["']og:([^"']+)["']/i);
      const contentMatch = tag.match(/content=["']([^"']+)["']/i);

      if (propertyMatch && contentMatch) {
        ogTags[propertyMatch[1]] = contentMatch[1];
      }
    }
    if (Object.keys(ogTags).length > 0) {
      metadata.openGraph = ogTags;
    }

    // Extract language
    const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
    if (langMatch) metadata.language = langMatch[1];

    return metadata;
  }

  extractFromArxiv(data) {
    return {
      contentType: 'arxiv-paper',
      source: 'arxiv',
      title: data.title,
      authors: data.authors,
      abstract: data.summary,
      categories: data.categories,
      publishedAt: data.published,
      updatedAt: data.updated,
      doi: data.doi,
      arxivId: data.id,
      pdfUrl: data.pdfUrl,
      extractedAt: new Date().toISOString()
    };
  }

  extractFromGitHub(data) {
    return {
      contentType: 'github-repo',
      source: 'github',
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      owner: data.owner?.login,
      language: data.language,
      stars: data.stargazers_count,
      forks: data.forks_count,
      topics: data.topics,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      homepage: data.homepage,
      license: data.license?.name,
      extractedAt: new Date().toISOString()
    };
  }

  extractFromYouTube(data) {
    return {
      contentType: 'youtube-video',
      source: 'youtube',
      videoId: data.id,
      title: data.snippet?.title,
      description: data.snippet?.description,
      channel: data.snippet?.channelTitle,
      channelId: data.snippet?.channelId,
      publishedAt: data.snippet?.publishedAt,
      tags: data.snippet?.tags,
      duration: data.contentDetails?.duration,
      views: data.statistics?.viewCount,
      likes: data.statistics?.likeCount,
      extractedAt: new Date().toISOString()
    };
  }

  extractFromWikipedia(data) {
    return {
      contentType: 'wikipedia-article',
      source: 'wikipedia',
      pageId: data.pageid,
      title: data.title,
      categories: data.categories?.map(c => c.title),
      lastRevision: data.revisions?.[0],
      extractedAt: new Date().toISOString()
    };
  }
}

/**
 * Main Live Scraper class
 */
class LiveScraper extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      ...SCRAPER_CONFIG,
      ...options
    };

    this.rateLimiters = new Map();
    this.deduplicator = new ContentDeduplicator();
    this.chunker = new ContentChunker(options.chunking);
    this.metadataExtractor = new MetadataExtractor();

    this.activeScrapers = new Map();
    this.monitors = new Map();
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      duplicatesFound: 0,
      bytesDownloaded: 0,
      itemsProcessed: 0,
      startedAt: Date.now()
    };

    this.isDistributed = options.distributed || false;
    this.nodeId = options.nodeId || crypto.randomBytes(8).toString('hex');
  }

  /**
   * Get or create a rate limiter for a source
   */
  getRateLimiter(source) {
    if (!this.rateLimiters.has(source)) {
      const limit = this.config.rateLimits[source] || this.config.rateLimits.default;
      this.rateLimiters.set(source, new RateLimiter(limit));
    }
    return this.rateLimiters.get(source);
  }

  /**
   * Get politeness delay for a source
   */
  getDelay(source, level = 'default') {
    const sourceConfig = this.config.sources[source];
    return sourceConfig?.delay || this.config.delays[level];
  }

  /**
   * Get random user agent
   */
  getUserAgent() {
    const agents = this.config.userAgents;
    return agents[Math.floor(Math.random() * agents.length)];
  }

  /**
   * Make an HTTP request with rate limiting and politeness
   */
  async fetch(url, options = {}) {
    const source = options.source || 'default';
    const rateLimiter = this.getRateLimiter(source);

    // Acquire rate limit slot
    await rateLimiter.acquire();

    // Add politeness delay
    const delay = this.getDelay(source, options.politeness);
    await sleep(delay);

    this.stats.totalRequests++;

    try {
      // In a real implementation, use node-fetch or axios
      // This is a mock implementation
      this.emit('request', { url, source });

      const response = await this.mockFetch(url, {
        headers: {
          'User-Agent': this.getUserAgent(),
          ...options.headers
        },
        ...options
      });

      this.stats.successfulRequests++;
      this.stats.bytesDownloaded += response.data?.length || 0;

      return response;
    } catch (error) {
      this.stats.failedRequests++;
      this.emit('error', { url, source, error });
      throw error;
    }
  }

  /**
   * Mock fetch for demonstration (replace with real fetch in production)
   */
  async mockFetch(url, options) {
    // Simulate network delay
    await sleep(Math.random() * 100 + 50);

    return {
      ok: true,
      status: 200,
      data: `Mock content from ${url}`,
      headers: {}
    };
  }

  /**
   * Extract content from HTML
   */
  extractContent(html) {
    // Remove script and style tags
    let content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove HTML tags
    content = content.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    content = content
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .trim();

    return content;
  }

  /**
   * Scrape a generic URL
   */
  async scrapeUrl(url, options = {}) {
    this.emit('scrape:start', { url });

    try {
      const response = await this.fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = response.data;
      const metadata = this.metadataExtractor.extractFromHTML(html, url);
      const content = this.extractContent(html);

      // Check for duplicates
      if (this.deduplicator.isDuplicate(content)) {
        this.stats.duplicatesFound++;
        this.emit('duplicate', { url, metadata });
        return null;
      }

      // Add to deduplicator
      this.deduplicator.addContent(content, metadata);

      // Chunk content
      const chunks = this.chunker.chunk(content, metadata);

      this.stats.itemsProcessed++;
      this.emit('scrape:complete', { url, metadata, chunks });

      return {
        url,
        metadata,
        content,
        chunks,
        scrapedAt: new Date().toISOString(),
        nodeId: this.nodeId
      };
    } catch (error) {
      this.emit('scrape:error', { url, error });
      throw error;
    }
  }

  /**
   * Scrape arXiv papers
   */
  async scrapeArxiv(query, options = {}) {
    const maxResults = options.maxResults || 10;
    const apiUrl = `${this.config.sources.arxiv.apiUrl}?search_query=${encodeURIComponent(query)}&max_results=${maxResults}`;

    this.emit('scrape:start', { source: 'arxiv', query });

    try {
      const response = await this.fetch(apiUrl, {
        source: 'arxiv',
        ...options
      });

      // Parse XML response (simplified)
      const papers = this.parseArxivXML(response.data);
      const results = [];

      for (const paper of papers) {
        const metadata = this.metadataExtractor.extractFromArxiv(paper);

        // Check for duplicates
        if (this.deduplicator.isDuplicate(paper.summary)) {
          this.stats.duplicatesFound++;
          continue;
        }

        this.deduplicator.addContent(paper.summary, metadata);

        // Chunk abstract
        const chunks = this.chunker.chunk(paper.summary, metadata);

        results.push({
          metadata,
          content: paper.summary,
          chunks,
          scrapedAt: new Date().toISOString(),
          nodeId: this.nodeId
        });

        this.stats.itemsProcessed++;
      }

      this.emit('scrape:complete', { source: 'arxiv', query, results });
      return results;
    } catch (error) {
      this.emit('scrape:error', { source: 'arxiv', query, error });
      throw error;
    }
  }

  parseArxivXML(xml) {
    // Simplified XML parsing (use a proper XML parser in production)
    return [
      {
        id: 'mock-arxiv-id',
        title: 'Example Paper Title',
        authors: ['Author 1', 'Author 2'],
        summary: 'This is a mock abstract from arXiv.',
        categories: ['cs.AI', 'cs.LG'],
        published: new Date().toISOString(),
        updated: new Date().toISOString(),
        pdfUrl: 'https://arxiv.org/pdf/mock.pdf'
      }
    ];
  }

  /**
   * Scrape GitHub repositories
   */
  async scrapeGitHub(repoPath, options = {}) {
    const apiUrl = `${this.config.sources.github.apiUrl}/repos/${repoPath}`;

    this.emit('scrape:start', { source: 'github', repoPath });

    try {
      const response = await this.fetch(apiUrl, {
        source: 'github',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...options.headers
        },
        ...options
      });

      const data = JSON.parse(response.data);
      const metadata = this.metadataExtractor.extractFromGitHub(data);

      // Get README content
      const readmeUrl = `${apiUrl}/readme`;
      const readmeResponse = await this.fetch(readmeUrl, {
        source: 'github',
        headers: {
          'Accept': 'application/vnd.github.v3.raw',
          ...options.headers
        }
      });

      const content = readmeResponse.data;

      // Check for duplicates
      if (this.deduplicator.isDuplicate(content)) {
        this.stats.duplicatesFound++;
        return null;
      }

      this.deduplicator.addContent(content, metadata);

      // Chunk README
      const chunks = this.chunker.chunk(content, metadata);

      this.stats.itemsProcessed++;
      this.emit('scrape:complete', { source: 'github', repoPath, metadata });

      return {
        metadata,
        content,
        chunks,
        scrapedAt: new Date().toISOString(),
        nodeId: this.nodeId
      };
    } catch (error) {
      this.emit('scrape:error', { source: 'github', repoPath, error });
      throw error;
    }
  }

  /**
   * Scrape YouTube video transcripts
   */
  async scrapeYouTube(videoId, options = {}) {
    this.emit('scrape:start', { source: 'youtube', videoId });

    try {
      // Get video details
      const videoUrl = `${this.config.sources.youtube.apiUrl}/videos?id=${videoId}&part=snippet,contentDetails,statistics`;
      const response = await this.fetch(videoUrl, {
        source: 'youtube',
        ...options
      });

      const data = JSON.parse(response.data);
      const videoData = data.items?.[0];

      if (!videoData) {
        throw new Error('Video not found');
      }

      const metadata = this.metadataExtractor.extractFromYouTube(videoData);

      // Get transcript (mock - use youtube-transcript library in production)
      const transcript = await this.getYouTubeTranscript(videoId);

      // Check for duplicates
      if (this.deduplicator.isDuplicate(transcript)) {
        this.stats.duplicatesFound++;
        return null;
      }

      this.deduplicator.addContent(transcript, metadata);

      // Chunk transcript
      const chunks = this.chunker.chunk(transcript, metadata);

      this.stats.itemsProcessed++;
      this.emit('scrape:complete', { source: 'youtube', videoId, metadata });

      return {
        metadata,
        content: transcript,
        chunks,
        scrapedAt: new Date().toISOString(),
        nodeId: this.nodeId
      };
    } catch (error) {
      this.emit('scrape:error', { source: 'youtube', videoId, error });
      throw error;
    }
  }

  async getYouTubeTranscript(videoId) {
    // Mock transcript - use youtube-transcript library in production
    return `This is a mock transcript for video ${videoId}.
    In production, this would contain the actual captions/subtitles.`;
  }

  /**
   * Scrape Wikipedia articles
   */
  async scrapeWikipedia(title, options = {}) {
    const apiUrl = `${this.config.sources.wikipedia.apiUrl}?action=query&format=json&titles=${encodeURIComponent(title)}&prop=extracts|categories&explaintext=1`;

    this.emit('scrape:start', { source: 'wikipedia', title });

    try {
      const response = await this.fetch(apiUrl, {
        source: 'wikipedia',
        ...options
      });

      const data = JSON.parse(response.data);
      const pages = data.query?.pages;
      const pageId = Object.keys(pages)[0];
      const pageData = pages[pageId];

      if (pageId === '-1') {
        throw new Error('Page not found');
      }

      const metadata = this.metadataExtractor.extractFromWikipedia(pageData);
      const content = pageData.extract;

      // Check for duplicates
      if (this.deduplicator.isDuplicate(content)) {
        this.stats.duplicatesFound++;
        return null;
      }

      this.deduplicator.addContent(content, metadata);

      // Chunk article
      const chunks = this.chunker.chunk(content, metadata);

      this.stats.itemsProcessed++;
      this.emit('scrape:complete', { source: 'wikipedia', title, metadata });

      return {
        metadata,
        content,
        chunks,
        scrapedAt: new Date().toISOString(),
        nodeId: this.nodeId
      };
    } catch (error) {
      this.emit('scrape:error', { source: 'wikipedia', title, error });
      throw error;
    }
  }

  /**
   * Monitor a URL for changes
   */
  startMonitoring(url, options = {}) {
    const interval = options.interval || 60000; // 1 minute default
    const monitorId = crypto.randomBytes(8).toString('hex');

    let lastContent = null;
    let lastHash = null;

    const check = async () => {
      try {
        const result = await this.scrapeUrl(url, options);

        if (result) {
          const currentHash = this.deduplicator.hash(result.content);

          if (lastHash && currentHash !== lastHash) {
            this.emit('content:changed', {
              url,
              monitorId,
              previous: lastContent,
              current: result,
              changedAt: new Date().toISOString()
            });
          }

          lastContent = result;
          lastHash = currentHash;
        }
      } catch (error) {
        this.emit('monitor:error', { url, monitorId, error });
      }
    };

    // Initial check
    check();

    // Set up interval
    const intervalId = setInterval(check, interval);

    this.monitors.set(monitorId, {
      url,
      intervalId,
      startedAt: Date.now(),
      options
    });

    this.emit('monitor:start', { url, monitorId, interval });

    return monitorId;
  }

  /**
   * Stop monitoring a URL
   */
  stopMonitoring(monitorId) {
    const monitor = this.monitors.get(monitorId);

    if (monitor) {
      clearInterval(monitor.intervalId);
      this.monitors.delete(monitorId);
      this.emit('monitor:stop', { monitorId, url: monitor.url });
      return true;
    }

    return false;
  }

  /**
   * Get all active monitors
   */
  getMonitors() {
    return Array.from(this.monitors.entries()).map(([id, monitor]) => ({
      id,
      url: monitor.url,
      startedAt: monitor.startedAt,
      uptime: Date.now() - monitor.startedAt
    }));
  }

  /**
   * Distributed scraping coordination
   */
  async distributeWork(urls, options = {}) {
    if (!this.isDistributed) {
      throw new Error('Distributed mode not enabled');
    }

    const workers = options.workers || 4;
    const chunkSize = Math.ceil(urls.length / workers);
    const results = [];

    this.emit('distribute:start', { totalUrls: urls.length, workers });

    // Split work into chunks
    for (let i = 0; i < workers; i++) {
      const chunk = urls.slice(i * chunkSize, (i + 1) * chunkSize);

      if (chunk.length === 0) continue;

      // In production, this would dispatch to actual worker nodes
      const workerPromise = this.processChunk(chunk, {
        ...options,
        workerId: i,
        nodeId: this.nodeId
      });

      results.push(workerPromise);
    }

    const allResults = await Promise.all(results);
    const flatResults = allResults.flat();

    this.emit('distribute:complete', {
      totalUrls: urls.length,
      processed: flatResults.length
    });

    return flatResults;
  }

  async processChunk(urls, options) {
    const results = [];

    for (const url of urls) {
      try {
        const result = await this.scrapeUrl(url, options);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        this.emit('chunk:error', { url, workerId: options.workerId, error });
      }
    }

    return results;
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startedAt;
    const requestsPerMinute = (this.stats.totalRequests / uptime) * 60000;

    return {
      ...this.stats,
      uptime,
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      successRate: this.stats.totalRequests > 0
        ? (this.stats.successfulRequests / this.stats.totalRequests) * 100
        : 0,
      deduplicationRate: this.stats.itemsProcessed > 0
        ? (this.stats.duplicatesFound / (this.stats.itemsProcessed + this.stats.duplicatesFound)) * 100
        : 0,
      activeMonitors: this.monitors.size,
      cachedContent: this.deduplicator.size()
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      duplicatesFound: 0,
      bytesDownloaded: 0,
      itemsProcessed: 0,
      startedAt: Date.now()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches() {
    this.deduplicator.clear();
    this.rateLimiters.forEach(limiter => limiter.reset());
  }

  /**
   * Shutdown scraper
   */
  async shutdown() {
    // Stop all monitors
    for (const [monitorId] of this.monitors) {
      this.stopMonitoring(monitorId);
    }

    this.emit('shutdown');
    this.removeAllListeners();
  }
}

/**
 * Export classes and configuration
 */
export {
  LiveScraper,
  RateLimiter,
  ContentDeduplicator,
  ContentChunker,
  MetadataExtractor,
  SCRAPER_CONFIG
};

export default LiveScraper;
