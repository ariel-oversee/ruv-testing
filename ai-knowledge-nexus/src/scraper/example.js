/**
 * AI Knowledge Nexus - Live Scraper Usage Examples
 *
 * Comprehensive examples demonstrating all scraper features
 */

import LiveScraper from './live-scraper.js';

/**
 * Example 1: Basic URL Scraping
 */
async function basicScraping() {
  console.log('\n=== Example 1: Basic URL Scraping ===\n');

  const scraper = new LiveScraper();

  try {
    const result = await scraper.scrapeUrl('https://example.com');

    console.log('URL:', result.url);
    console.log('Title:', result.metadata.title);
    console.log('Content Length:', result.content.length);
    console.log('Chunks:', result.chunks.length);
    console.log('First Chunk:', result.chunks[0].content.substring(0, 100));
  } catch (error) {
    console.error('Scraping failed:', error.message);
  }
}

/**
 * Example 2: Multi-Source Scraping
 */
async function multiSourceScraping() {
  console.log('\n=== Example 2: Multi-Source Scraping ===\n');

  const scraper = new LiveScraper();

  // ArXiv papers
  console.log('Scraping arXiv...');
  const papers = await scraper.scrapeArxiv('neural networks', {
    maxResults: 5
  });
  console.log(`Found ${papers.length} papers`);
  papers.forEach(paper => {
    console.log(`- ${paper.metadata.title}`);
  });

  // Wikipedia
  console.log('\nScraping Wikipedia...');
  const article = await scraper.scrapeWikipedia('Machine Learning');
  console.log(`Article: ${article.metadata.title}`);
  console.log(`Chunks: ${article.chunks.length}`);

  // GitHub (requires API token in production)
  console.log('\nScraping GitHub...');
  try {
    const repo = await scraper.scrapeGitHub('microsoft/vscode');
    console.log(`Repository: ${repo.metadata.fullName}`);
    console.log(`Stars: ${repo.metadata.stars}`);
  } catch (error) {
    console.log('GitHub API requires authentication in production');
  }
}

/**
 * Example 3: Custom Chunking Strategies
 */
async function chunkingStrategies() {
  console.log('\n=== Example 3: Chunking Strategies ===\n');

  const content = `
    Artificial intelligence (AI) is intelligence demonstrated by machines.
    This contrasts with natural intelligence displayed by animals.

    Machine learning is a subset of AI. It focuses on teaching computers
    to learn from data without being explicitly programmed.

    Deep learning uses neural networks with multiple layers. These networks
    can learn hierarchical representations of data.
  `;

  // Fixed size chunking
  console.log('Fixed Size Chunking:');
  const fixedChunker = new LiveScraper({
    chunking: { strategy: 'fixed', chunkSize: 50, overlap: 10 }
  }).chunker;
  const fixedChunks = fixedChunker.chunk(content);
  console.log(`Chunks: ${fixedChunks.length}`);

  // Sentence-based chunking
  console.log('\nSentence-Based Chunking:');
  const sentenceChunker = new LiveScraper({
    chunking: { strategy: 'sentence', chunkSize: 100, overlap: 20 }
  }).chunker;
  const sentenceChunks = sentenceChunker.chunk(content);
  console.log(`Chunks: ${sentenceChunks.length}`);

  // Paragraph-based chunking
  console.log('\nParagraph-Based Chunking:');
  const paragraphChunker = new LiveScraper({
    chunking: { strategy: 'paragraph', chunkSize: 200 }
  }).chunker;
  const paragraphChunks = paragraphChunker.chunk(content);
  console.log(`Chunks: ${paragraphChunks.length}`);

  // Display first chunk
  console.log('\nFirst chunk (sentence strategy):');
  console.log(sentenceChunks[0].content);
  console.log('Metadata:', sentenceChunks[0].metadata);
}

/**
 * Example 4: Content Deduplication
 */
async function contentDeduplication() {
  console.log('\n=== Example 4: Content Deduplication ===\n');

  const scraper = new LiveScraper();

  const urls = [
    'https://example.com/article1',
    'https://example.com/article1', // Duplicate
    'https://example.com/article2',
    'https://example.com/article1'  // Another duplicate
  ];

  let processed = 0;
  let duplicates = 0;

  for (const url of urls) {
    try {
      const result = await scraper.scrapeUrl(url);
      if (result) {
        processed++;
        console.log(`✓ Processed: ${url}`);
      } else {
        duplicates++;
        console.log(`⊗ Duplicate: ${url}`);
      }
    } catch (error) {
      console.error(`✗ Failed: ${url}`);
    }
  }

  console.log(`\nProcessed: ${processed}, Duplicates: ${duplicates}`);

  const stats = scraper.getStats();
  console.log(`Deduplication Rate: ${stats.deduplicationRate.toFixed(2)}%`);
}

/**
 * Example 5: Real-Time Content Monitoring
 */
async function realTimeMonitoring() {
  console.log('\n=== Example 5: Real-Time Content Monitoring ===\n');

  const scraper = new LiveScraper();

  // Set up event listeners
  scraper.on('content:changed', ({ url, current, changedAt }) => {
    console.log(`\n🔔 Content changed at ${url}`);
    console.log(`Changed at: ${changedAt}`);
    console.log(`New content preview: ${current.content.substring(0, 100)}...`);
  });

  scraper.on('monitor:start', ({ url, monitorId, interval }) => {
    console.log(`Started monitoring ${url}`);
    console.log(`Monitor ID: ${monitorId}`);
    console.log(`Check interval: ${interval}ms`);
  });

  // Start monitoring
  const monitorId = scraper.startMonitoring('https://news.example.com', {
    interval: 10000 // Check every 10 seconds
  });

  console.log(`\nMonitoring for 30 seconds...`);

  // Run for 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Stop monitoring
  scraper.stopMonitoring(monitorId);
  console.log('\nMonitoring stopped');

  // Show active monitors
  const monitors = scraper.getMonitors();
  console.log(`Active monitors: ${monitors.length}`);
}

/**
 * Example 6: Distributed Scraping
 */
async function distributedScraping() {
  console.log('\n=== Example 6: Distributed Scraping ===\n');

  const scraper = new LiveScraper({
    distributed: true,
    nodeId: 'scraper-node-1'
  });

  // Generate URLs to scrape
  const urls = Array.from({ length: 20 }, (_, i) =>
    `https://example.com/article${i + 1}`
  );

  console.log(`Scraping ${urls.length} URLs with 4 workers...`);

  const startTime = Date.now();

  try {
    const results = await scraper.distributeWork(urls, {
      workers: 4
    });

    const duration = Date.now() - startTime;

    console.log(`\nCompleted in ${duration}ms`);
    console.log(`Processed: ${results.length} URLs`);
    console.log(`Average: ${(duration / results.length).toFixed(2)}ms per URL`);
  } catch (error) {
    console.error('Distributed scraping failed:', error.message);
  }
}

/**
 * Example 7: Event-Driven Scraping
 */
async function eventDrivenScraping() {
  console.log('\n=== Example 7: Event-Driven Scraping ===\n');

  const scraper = new LiveScraper();

  // Set up comprehensive event listeners
  scraper.on('request', ({ url }) => {
    console.log(`→ Requesting: ${url}`);
  });

  scraper.on('scrape:start', ({ url }) => {
    console.log(`⏳ Scraping started: ${url}`);
  });

  scraper.on('scrape:complete', ({ url, metadata }) => {
    console.log(`✓ Scraping complete: ${url}`);
    console.log(`  Title: ${metadata.title}`);
  });

  scraper.on('duplicate', ({ url }) => {
    console.log(`⊗ Duplicate found: ${url}`);
  });

  scraper.on('error', ({ url, error }) => {
    console.error(`✗ Error: ${url} - ${error.message}`);
  });

  // Scrape some URLs
  const urls = [
    'https://example.com/page1',
    'https://example.com/page2',
    'https://example.com/page1' // Duplicate
  ];

  for (const url of urls) {
    try {
      await scraper.scrapeUrl(url);
    } catch (error) {
      // Error already logged via event
    }
  }
}

/**
 * Example 8: Statistics and Monitoring
 */
async function statisticsMonitoring() {
  console.log('\n=== Example 8: Statistics and Monitoring ===\n');

  const scraper = new LiveScraper();

  // Perform various scraping operations
  console.log('Performing scraping operations...');

  const operations = [
    scraper.scrapeUrl('https://example.com/1'),
    scraper.scrapeUrl('https://example.com/2'),
    scraper.scrapeArxiv('quantum computing', { maxResults: 3 }),
    scraper.scrapeWikipedia('Artificial Intelligence')
  ];

  await Promise.allSettled(operations);

  // Get statistics
  const stats = scraper.getStats();

  console.log('\nScraper Statistics:');
  console.log('─'.repeat(50));
  console.log(`Total Requests:        ${stats.totalRequests}`);
  console.log(`Successful Requests:   ${stats.successfulRequests}`);
  console.log(`Failed Requests:       ${stats.failedRequests}`);
  console.log(`Success Rate:          ${stats.successRate.toFixed(2)}%`);
  console.log(`Items Processed:       ${stats.itemsProcessed}`);
  console.log(`Duplicates Found:      ${stats.duplicatesFound}`);
  console.log(`Deduplication Rate:    ${stats.deduplicationRate.toFixed(2)}%`);
  console.log(`Bytes Downloaded:      ${(stats.bytesDownloaded / 1024).toFixed(2)} KB`);
  console.log(`Requests/Minute:       ${stats.requestsPerMinute.toFixed(2)}`);
  console.log(`Uptime:                ${(stats.uptime / 1000).toFixed(2)}s`);
  console.log(`Cached Content:        ${stats.cachedContent} items`);
  console.log(`Active Monitors:       ${stats.activeMonitors}`);
  console.log('─'.repeat(50));
}

/**
 * Example 9: Rate Limiting and Politeness
 */
async function rateLimitingDemo() {
  console.log('\n=== Example 9: Rate Limiting and Politeness ===\n');

  const scraper = new LiveScraper({
    rateLimits: {
      default: 5 // 5 requests per minute
    },
    delays: {
      default: 2000 // 2 second delay between requests
    }
  });

  console.log('Scraping with rate limiting (5 req/min, 2s delay)...');

  const urls = Array.from({ length: 8 }, (_, i) =>
    `https://example.com/page${i + 1}`
  );

  const startTime = Date.now();

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const requestStart = Date.now();

    try {
      await scraper.scrapeUrl(url, { source: 'default' });
      const duration = Date.now() - requestStart;
      console.log(`${i + 1}. Scraped ${url} in ${duration}ms`);
    } catch (error) {
      console.error(`${i + 1}. Failed: ${url}`);
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log(`\nTotal time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Average time per request: ${(totalDuration / urls.length).toFixed(2)}ms`);
}

/**
 * Example 10: Metadata Extraction
 */
async function metadataExtraction() {
  console.log('\n=== Example 10: Metadata Extraction ===\n');

  const scraper = new LiveScraper();

  // Scrape different sources
  console.log('Extracting metadata from various sources...\n');

  // Web page
  console.log('1. Web Page Metadata:');
  const webPage = await scraper.scrapeUrl('https://example.com');
  console.log(JSON.stringify(webPage.metadata, null, 2));

  // ArXiv paper
  console.log('\n2. ArXiv Paper Metadata:');
  const papers = await scraper.scrapeArxiv('deep learning', { maxResults: 1 });
  if (papers.length > 0) {
    console.log(JSON.stringify(papers[0].metadata, null, 2));
  }

  // Wikipedia article
  console.log('\n3. Wikipedia Article Metadata:');
  const article = await scraper.scrapeWikipedia('Neural Network');
  console.log(JSON.stringify(article.metadata, null, 2));
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  AI Knowledge Nexus - Live Scraper Examples     ║');
  console.log('╚══════════════════════════════════════════════════╝');

  try {
    await basicScraping();
    await multiSourceScraping();
    await chunkingStrategies();
    await contentDeduplication();
    await realTimeMonitoring();
    await distributedScraping();
    await eventDrivenScraping();
    await statisticsMonitoring();
    await rateLimitingDemo();
    await metadataExtraction();

    console.log('\n✓ All examples completed successfully!');
  } catch (error) {
    console.error('\n✗ Example failed:', error);
  }
}

/**
 * Run examples based on command line argument
 */
const example = process.argv[2];

if (!example) {
  console.log('Usage: node example.js <example-number>');
  console.log('Examples:');
  console.log('  1 - Basic URL Scraping');
  console.log('  2 - Multi-Source Scraping');
  console.log('  3 - Chunking Strategies');
  console.log('  4 - Content Deduplication');
  console.log('  5 - Real-Time Monitoring');
  console.log('  6 - Distributed Scraping');
  console.log('  7 - Event-Driven Scraping');
  console.log('  8 - Statistics and Monitoring');
  console.log('  9 - Rate Limiting and Politeness');
  console.log('  10 - Metadata Extraction');
  console.log('  all - Run all examples');
  process.exit(0);
}

// Run selected example
(async () => {
  switch (example) {
    case '1':
      await basicScraping();
      break;
    case '2':
      await multiSourceScraping();
      break;
    case '3':
      await chunkingStrategies();
      break;
    case '4':
      await contentDeduplication();
      break;
    case '5':
      await realTimeMonitoring();
      break;
    case '6':
      await distributedScraping();
      break;
    case '7':
      await eventDrivenScraping();
      break;
    case '8':
      await statisticsMonitoring();
      break;
    case '9':
      await rateLimitingDemo();
      break;
    case '10':
      await metadataExtraction();
      break;
    case 'all':
      await runAllExamples();
      break;
    default:
      console.error('Invalid example number');
      process.exit(1);
  }
})();
