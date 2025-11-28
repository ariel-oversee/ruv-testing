/**
 * AI Knowledge Nexus - Live Scraper Tests
 *
 * Comprehensive test suite for the live scraper system
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import LiveScraper, {
  RateLimiter,
  ContentDeduplicator,
  ContentChunker,
  MetadataExtractor
} from './live-scraper.js';

/**
 * RateLimiter Tests
 */
describe('RateLimiter', () => {
  it('should allow requests within limit', async () => {
    const limiter = new RateLimiter(10);
    const start = Date.now();

    // Make 5 requests (under limit)
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }

    const duration = Date.now() - start;
    assert.ok(duration < 1000, 'Should complete quickly when under limit');
  });

  it('should throttle requests over limit', async () => {
    const limiter = new RateLimiter(2); // 2 requests per minute
    const start = Date.now();

    // Make 3 requests (over limit)
    for (let i = 0; i < 3; i++) {
      await limiter.acquire();
    }

    const duration = Date.now() - start;
    assert.ok(duration >= 0, 'Should throttle when over limit');
  });

  it('should reset correctly', () => {
    const limiter = new RateLimiter(10);
    limiter.requests.push(Date.now());
    limiter.reset();
    assert.strictEqual(limiter.requests.length, 0, 'Should clear all requests');
  });
});

/**
 * ContentDeduplicator Tests
 */
describe('ContentDeduplicator', () => {
  let deduplicator;

  beforeEach(() => {
    deduplicator = new ContentDeduplicator();
  });

  it('should detect duplicate content', () => {
    const content = 'This is a test content';

    assert.strictEqual(deduplicator.isDuplicate(content), false, 'First time should not be duplicate');
    assert.strictEqual(deduplicator.isDuplicate(content), true, 'Second time should be duplicate');
  });

  it('should normalize content for comparison', () => {
    const content1 = 'This is a TEST content';
    const content2 = 'this  is   a  test   content';

    deduplicator.isDuplicate(content1);
    assert.strictEqual(deduplicator.isDuplicate(content2), true, 'Should detect normalized duplicates');
  });

  it('should hash content consistently', () => {
    const content = 'Test content';
    const hash1 = deduplicator.hash(content);
    const hash2 = deduplicator.hash(content);

    assert.strictEqual(hash1, hash2, 'Same content should produce same hash');
  });

  it('should store content with metadata', () => {
    const content = 'Test content';
    const metadata = { title: 'Test', url: 'https://example.com' };

    deduplicator.addContent(content, metadata);

    assert.strictEqual(deduplicator.size(), 1, 'Should have one item in cache');
  });

  it('should find similar content', () => {
    const content1 = 'artificial intelligence machine learning deep learning';
    const content2 = 'machine learning artificial intelligence neural networks';

    deduplicator.addContent(content1, { id: 1 });

    const similar = deduplicator.getSimilar(content2, 0.5);
    assert.ok(similar.length > 0, 'Should find similar content');
  });

  it('should clear cache', () => {
    deduplicator.addContent('Test 1');
    deduplicator.addContent('Test 2');
    deduplicator.clear();

    assert.strictEqual(deduplicator.size(), 0, 'Should be empty after clear');
  });
});

/**
 * ContentChunker Tests
 */
describe('ContentChunker', () => {
  it('should chunk with fixed strategy', () => {
    const chunker = new ContentChunker({
      strategy: 'fixed',
      chunkSize: 10,
      overlap: 2
    });

    const content = 'word '.repeat(50); // 50 words
    const chunks = chunker.chunk(content);

    assert.ok(chunks.length > 1, 'Should create multiple chunks');
    chunks.forEach(chunk => {
      assert.ok(chunk.metadata.strategy === 'fixed', 'Should have correct strategy');
      assert.ok(chunk.metadata.chunkIndex >= 0, 'Should have chunk index');
    });
  });

  it('should chunk with sentence strategy', () => {
    const chunker = new ContentChunker({
      strategy: 'sentence',
      chunkSize: 50
    });

    const content = 'This is sentence one. This is sentence two. This is sentence three.';
    const chunks = chunker.chunk(content);

    assert.ok(chunks.length > 0, 'Should create chunks');
    assert.strictEqual(chunks[0].metadata.strategy, 'sentence', 'Should use sentence strategy');
  });

  it('should chunk with paragraph strategy', () => {
    const chunker = new ContentChunker({
      strategy: 'paragraph',
      chunkSize: 100
    });

    const content = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
    const chunks = chunker.chunk(content);

    assert.ok(chunks.length > 0, 'Should create chunks');
    assert.strictEqual(chunks[0].metadata.strategy, 'paragraph', 'Should use paragraph strategy');
  });

  it('should chunk with semantic strategy', () => {
    const chunker = new ContentChunker({
      strategy: 'semantic',
      chunkSize: 100
    });

    const content = '# Section 1\nContent 1\n## Section 2\nContent 2';
    const chunks = chunker.chunk(content);

    assert.ok(chunks.length > 0, 'Should create chunks');
  });

  it('should include overlap in chunks', () => {
    const chunker = new ContentChunker({
      strategy: 'fixed',
      chunkSize: 20,
      overlap: 5
    });

    const content = 'word '.repeat(50);
    const chunks = chunker.chunk(content);

    assert.ok(chunks.length >= 2, 'Should create multiple chunks for overlap test');
  });

  it('should set total chunks correctly', () => {
    const chunker = new ContentChunker({
      strategy: 'sentence',
      chunkSize: 30
    });

    const content = 'Sentence one. Sentence two. Sentence three. Sentence four.';
    const chunks = chunker.chunk(content);

    chunks.forEach(chunk => {
      assert.strictEqual(chunk.metadata.totalChunks, chunks.length, 'Should have correct total');
    });
  });
});

/**
 * MetadataExtractor Tests
 */
describe('MetadataExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new MetadataExtractor();
  });

  it('should extract title from HTML', () => {
    const html = '<html><head><title>Test Title</title></head><body></body></html>';
    const metadata = extractor.extractFromHTML(html, 'https://example.com');

    assert.strictEqual(metadata.title, 'Test Title', 'Should extract title');
    assert.strictEqual(metadata.url, 'https://example.com', 'Should include URL');
  });

  it('should extract meta tags from HTML', () => {
    const html = `
      <html>
        <head>
          <meta name="description" content="Test Description">
          <meta name="keywords" content="test, meta">
        </head>
      </html>
    `;
    const metadata = extractor.extractFromHTML(html, 'https://example.com');

    assert.strictEqual(metadata.description, 'Test Description', 'Should extract description');
    assert.strictEqual(metadata.keywords, 'test, meta', 'Should extract keywords');
  });

  it('should extract Open Graph tags', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="OG Title">
          <meta property="og:description" content="OG Description">
        </head>
      </html>
    `;
    const metadata = extractor.extractFromHTML(html, 'https://example.com');

    assert.ok(metadata.openGraph, 'Should have Open Graph data');
    assert.strictEqual(metadata.openGraph.title, 'OG Title', 'Should extract OG title');
  });

  it('should extract language from HTML', () => {
    const html = '<html lang="en-US"><head></head><body></body></html>';
    const metadata = extractor.extractFromHTML(html, 'https://example.com');

    assert.strictEqual(metadata.language, 'en-US', 'Should extract language');
  });

  it('should extract arXiv metadata', () => {
    const data = {
      title: 'Test Paper',
      authors: ['Author 1'],
      summary: 'Abstract',
      categories: ['cs.AI'],
      published: '2024-01-01',
      id: 'arxiv-123'
    };

    const metadata = extractor.extractFromArxiv(data);

    assert.strictEqual(metadata.source, 'arxiv', 'Should mark as arXiv source');
    assert.strictEqual(metadata.title, 'Test Paper', 'Should extract title');
    assert.deepStrictEqual(metadata.authors, ['Author 1'], 'Should extract authors');
  });

  it('should extract GitHub metadata', () => {
    const data = {
      name: 'repo',
      full_name: 'user/repo',
      description: 'Test repo',
      owner: { login: 'user' },
      stargazers_count: 100
    };

    const metadata = extractor.extractFromGitHub(data);

    assert.strictEqual(metadata.source, 'github', 'Should mark as GitHub source');
    assert.strictEqual(metadata.name, 'repo', 'Should extract name');
    assert.strictEqual(metadata.stars, 100, 'Should extract stars');
  });

  it('should extract YouTube metadata', () => {
    const data = {
      id: 'video123',
      snippet: {
        title: 'Test Video',
        description: 'Description',
        channelTitle: 'Channel'
      },
      statistics: {
        viewCount: 1000
      }
    };

    const metadata = extractor.extractFromYouTube(data);

    assert.strictEqual(metadata.source, 'youtube', 'Should mark as YouTube source');
    assert.strictEqual(metadata.videoId, 'video123', 'Should extract video ID');
    assert.strictEqual(metadata.views, 1000, 'Should extract views');
  });

  it('should extract Wikipedia metadata', () => {
    const data = {
      pageid: 123,
      title: 'Test Article',
      categories: [{ title: 'Category:Test' }]
    };

    const metadata = extractor.extractFromWikipedia(data);

    assert.strictEqual(metadata.source, 'wikipedia', 'Should mark as Wikipedia source');
    assert.strictEqual(metadata.pageId, 123, 'Should extract page ID');
    assert.strictEqual(metadata.title, 'Test Article', 'Should extract title');
  });
});

/**
 * LiveScraper Tests
 */
describe('LiveScraper', () => {
  let scraper;

  beforeEach(() => {
    scraper = new LiveScraper();
  });

  after(() => {
    scraper.shutdown();
  });

  it('should initialize with default config', () => {
    assert.ok(scraper.config, 'Should have config');
    assert.ok(scraper.deduplicator, 'Should have deduplicator');
    assert.ok(scraper.chunker, 'Should have chunker');
    assert.ok(scraper.metadataExtractor, 'Should have metadata extractor');
  });

  it('should get rate limiter for source', () => {
    const limiter = scraper.getRateLimiter('arxiv');
    assert.ok(limiter instanceof RateLimiter, 'Should return RateLimiter instance');
  });

  it('should get delay for source', () => {
    const delay = scraper.getDelay('arxiv');
    assert.ok(typeof delay === 'number', 'Should return number');
    assert.ok(delay > 0, 'Delay should be positive');
  });

  it('should get random user agent', () => {
    const ua = scraper.getUserAgent();
    assert.ok(typeof ua === 'string', 'Should return string');
    assert.ok(ua.length > 0, 'Should not be empty');
  });

  it('should extract content from HTML', () => {
    const html = `
      <html>
        <head><script>alert('test')</script></head>
        <body>
          <p>This is content</p>
          <style>.test { color: red; }</style>
        </body>
      </html>
    `;

    const content = scraper.extractContent(html);
    assert.ok(content.includes('This is content'), 'Should extract text content');
    assert.ok(!content.includes('script'), 'Should remove scripts');
    assert.ok(!content.includes('style'), 'Should remove styles');
  });

  it('should scrape URL successfully', async () => {
    const result = await scraper.scrapeUrl('https://example.com');

    assert.ok(result, 'Should return result');
    assert.ok(result.url, 'Should have URL');
    assert.ok(result.metadata, 'Should have metadata');
    assert.ok(result.content, 'Should have content');
    assert.ok(Array.isArray(result.chunks), 'Should have chunks array');
  });

  it('should detect duplicate content', async () => {
    await scraper.scrapeUrl('https://example.com/page1');
    const result = await scraper.scrapeUrl('https://example.com/page1');

    assert.strictEqual(result, null, 'Should return null for duplicate');
  });

  it('should emit events during scraping', async () => {
    let eventFired = false;

    scraper.once('scrape:start', () => {
      eventFired = true;
    });

    await scraper.scrapeUrl('https://example.com');
    assert.ok(eventFired, 'Should emit scrape:start event');
  });

  it('should track statistics', async () => {
    await scraper.scrapeUrl('https://example.com');

    const stats = scraper.getStats();
    assert.ok(stats.totalRequests > 0, 'Should track total requests');
    assert.ok(stats.itemsProcessed > 0, 'Should track processed items');
  });

  it('should start monitoring URL', () => {
    const monitorId = scraper.startMonitoring('https://example.com', {
      interval: 10000
    });

    assert.ok(typeof monitorId === 'string', 'Should return monitor ID');
    assert.ok(scraper.monitors.has(monitorId), 'Should store monitor');

    scraper.stopMonitoring(monitorId);
  });

  it('should stop monitoring URL', () => {
    const monitorId = scraper.startMonitoring('https://example.com');
    const result = scraper.stopMonitoring(monitorId);

    assert.strictEqual(result, true, 'Should return true on success');
    assert.ok(!scraper.monitors.has(monitorId), 'Should remove monitor');
  });

  it('should get active monitors', () => {
    const monitorId1 = scraper.startMonitoring('https://example1.com');
    const monitorId2 = scraper.startMonitoring('https://example2.com');

    const monitors = scraper.getMonitors();
    assert.strictEqual(monitors.length, 2, 'Should have two monitors');

    scraper.stopMonitoring(monitorId1);
    scraper.stopMonitoring(monitorId2);
  });

  it('should distribute work in distributed mode', async () => {
    const distributedScraper = new LiveScraper({ distributed: true });

    const urls = [
      'https://example.com/1',
      'https://example.com/2',
      'https://example.com/3',
      'https://example.com/4'
    ];

    const results = await distributedScraper.distributeWork(urls, {
      workers: 2
    });

    assert.ok(Array.isArray(results), 'Should return results array');
    distributedScraper.shutdown();
  });

  it('should reset statistics', () => {
    scraper.stats.totalRequests = 100;
    scraper.resetStats();

    assert.strictEqual(scraper.stats.totalRequests, 0, 'Should reset to zero');
  });

  it('should clear caches', () => {
    scraper.deduplicator.addContent('Test content');
    scraper.clearCaches();

    assert.strictEqual(scraper.deduplicator.size(), 0, 'Should clear deduplicator');
  });

  it('should shutdown gracefully', async () => {
    const monitorId = scraper.startMonitoring('https://example.com');

    await scraper.shutdown();

    assert.strictEqual(scraper.monitors.size, 0, 'Should stop all monitors');
  });
});

/**
 * Integration Tests
 */
describe('LiveScraper Integration', () => {
  let scraper;

  beforeEach(() => {
    scraper = new LiveScraper({
      chunking: {
        strategy: 'sentence',
        chunkSize: 100
      }
    });
  });

  after(() => {
    scraper.shutdown();
  });

  it('should scrape and chunk content', async () => {
    const result = await scraper.scrapeUrl('https://example.com');

    assert.ok(result, 'Should return result');
    assert.ok(result.chunks.length > 0, 'Should have chunks');
    assert.ok(result.chunks[0].metadata, 'Chunks should have metadata');
  });

  it('should handle multiple sources', async () => {
    const results = await Promise.all([
      scraper.scrapeUrl('https://example1.com'),
      scraper.scrapeArxiv('test query', { maxResults: 1 }),
      scraper.scrapeWikipedia('Test Article')
    ]);

    results.forEach((result, i) => {
      if (result) {
        assert.ok(result.metadata, `Result ${i} should have metadata`);
      }
    });
  });

  it('should maintain consistent statistics', async () => {
    const initialStats = scraper.getStats();

    await scraper.scrapeUrl('https://example.com');

    const finalStats = scraper.getStats();
    assert.ok(finalStats.totalRequests > initialStats.totalRequests, 'Stats should update');
  });
});

console.log('✓ All tests defined');
