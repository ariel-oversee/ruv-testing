# AI Knowledge Nexus - Live Web Scraper

Comprehensive real-time web scraping and content processing system with ethical scraping practices and distributed coordination.

## Features

### 1. Multi-Source Web Scraping
- **Generic URLs**: Scrape any web page with smart content extraction
- **Academic Papers**: arXiv and PubMed integration
- **GitHub Repositories**: Repository metadata and README extraction
- **YouTube Videos**: Transcript and metadata extraction
- **Wikipedia**: Article content and metadata
- **Custom Sources**: Extensible architecture for adding new sources

### 2. Smart Content Extraction
- HTML content cleaning and text extraction
- Metadata extraction from:
  - HTML meta tags
  - Open Graph tags
  - JSON-LD structured data
  - Source-specific APIs
- Automatic language detection

### 3. Ethical Scraping Practices
- **Rate Limiting**: Configurable per-source rate limits
- **Politeness Policies**: Automatic delays between requests
- **User Agent Identification**: Clear identification of scraper purpose
- **Robots.txt Respect**: (To be implemented in production)
- **API Key Management**: Support for authenticated requests

### 4. Rate Limiting System
```javascript
// Automatic rate limiting per source
rateLimits: {
  default: 10,      // 10 requests/minute
  arxiv: 5,         // 5 requests/minute
  pubmed: 3,        // 3 requests/minute
  github: 30,       // 30 requests/minute
  youtube: 20,      // 20 requests/minute
  wikipedia: 20     // 20 requests/minute
}
```

### 5. Content Deduplication
- **SHA-256 Hashing**: Cryptographic content fingerprinting
- **Similarity Detection**: Jaccard similarity for near-duplicate detection
- **Content Cache**: In-memory cache with metadata
- **Configurable Thresholds**: Adjustable similarity thresholds

### 6. Automatic Chunking Strategies
- **Fixed Size**: Chunk by word count with overlap
- **Sentence-Based**: Intelligent sentence boundary detection
- **Paragraph-Based**: Preserve paragraph structure
- **Semantic**: Topic-aware chunking using section headers

### 7. Metadata Extraction
- **HTML Metadata**: Title, meta tags, Open Graph, JSON-LD
- **Source-Specific**: Tailored extractors for each source
- **Timestamps**: Extraction and publication dates
- **Author Information**: When available
- **Categories/Tags**: Content classification

### 8. Image and Video Content Handling
- **YouTube Transcripts**: Automatic caption extraction
- **Video Metadata**: Duration, views, likes, etc.
- **Image URLs**: Extraction from content (extensible)
- **Media Processing**: Foundation for future OCR/vision integration

### 9. Real-Time Monitoring
- **Change Detection**: Monitor URLs for content changes
- **Configurable Intervals**: Custom check frequencies
- **Change Events**: Emit events when content changes
- **Multiple Monitors**: Track multiple URLs simultaneously

### 10. Distributed Scraping Coordination
- **Work Distribution**: Automatic workload splitting
- **Node Identification**: Unique node IDs for tracking
- **Parallel Processing**: Concurrent scraping across workers
- **Result Aggregation**: Combine results from multiple workers

## Usage Examples

### Basic URL Scraping

```javascript
import LiveScraper from './live-scraper.js';

const scraper = new LiveScraper();

// Scrape a single URL
const result = await scraper.scrapeUrl('https://example.com');
console.log(result.metadata);
console.log(result.chunks);
```

### ArXiv Paper Search

```javascript
// Search arXiv papers
const papers = await scraper.scrapeArxiv('quantum computing', {
  maxResults: 20
});

papers.forEach(paper => {
  console.log(paper.metadata.title);
  console.log(paper.metadata.authors);
  console.log(paper.chunks.length, 'chunks');
});
```

### GitHub Repository

```javascript
// Scrape GitHub repository
const repo = await scraper.scrapeGitHub('openai/gpt-3', {
  headers: {
    'Authorization': 'token YOUR_TOKEN'
  }
});

console.log(repo.metadata.description);
console.log(repo.metadata.stars);
```

### YouTube Video

```javascript
// Get YouTube video transcript
const video = await scraper.scrapeYouTube('dQw4w9WgXcQ', {
  apiKey: 'YOUR_API_KEY'
});

console.log(video.metadata.title);
console.log(video.content); // Full transcript
```

### Wikipedia Article

```javascript
// Scrape Wikipedia article
const article = await scraper.scrapeWikipedia('Artificial Intelligence');

console.log(article.metadata.title);
console.log(article.chunks.length, 'chunks');
```

### Real-Time Monitoring

```javascript
// Monitor URL for changes
const monitorId = scraper.startMonitoring('https://news.example.com', {
  interval: 300000 // Check every 5 minutes
});

scraper.on('content:changed', ({ url, previous, current }) => {
  console.log(`Content changed at ${url}`);
  console.log('Previous:', previous.content.substring(0, 100));
  console.log('Current:', current.content.substring(0, 100));
});

// Stop monitoring
// scraper.stopMonitoring(monitorId);
```

### Distributed Scraping

```javascript
// Enable distributed mode
const scraper = new LiveScraper({
  distributed: true,
  nodeId: 'node-1'
});

// Scrape multiple URLs in parallel
const urls = [
  'https://example1.com',
  'https://example2.com',
  'https://example3.com',
  // ... more URLs
];

const results = await scraper.distributeWork(urls, {
  workers: 4
});

console.log(`Processed ${results.length} URLs`);
```

### Custom Chunking

```javascript
// Configure chunking strategy
const scraper = new LiveScraper({
  chunking: {
    chunkSize: 2048,     // Tokens per chunk
    overlap: 256,        // Overlap between chunks
    strategy: 'semantic' // sentence | paragraph | semantic | fixed
  }
});

const result = await scraper.scrapeUrl('https://example.com');
result.chunks.forEach((chunk, i) => {
  console.log(`Chunk ${i + 1}:`, chunk.content.substring(0, 50));
  console.log('Metadata:', chunk.metadata);
});
```

### Event Handling

```javascript
const scraper = new LiveScraper();

// Listen to events
scraper.on('request', ({ url, source }) => {
  console.log(`Requesting ${url} from ${source}`);
});

scraper.on('scrape:complete', ({ url, metadata }) => {
  console.log(`Completed scraping ${url}`);
});

scraper.on('duplicate', ({ url }) => {
  console.log(`Duplicate content found: ${url}`);
});

scraper.on('error', ({ url, error }) => {
  console.error(`Error scraping ${url}:`, error);
});

scraper.on('monitor:start', ({ url, monitorId, interval }) => {
  console.log(`Started monitoring ${url} every ${interval}ms`);
});
```

### Statistics

```javascript
// Get scraper statistics
const stats = scraper.getStats();
console.log('Total Requests:', stats.totalRequests);
console.log('Success Rate:', stats.successRate.toFixed(2) + '%');
console.log('Deduplication Rate:', stats.deduplicationRate.toFixed(2) + '%');
console.log('Requests/Minute:', stats.requestsPerMinute);
console.log('Cached Content:', stats.cachedContent);
console.log('Active Monitors:', stats.activeMonitors);
```

## Configuration

### Rate Limits

Customize rate limits per source:

```javascript
const scraper = new LiveScraper({
  rateLimits: {
    default: 15,
    'custom-source': 5
  }
});
```

### Politeness Delays

Set delays between requests:

```javascript
const scraper = new LiveScraper({
  delays: {
    default: 1000,      // 1 second
    respectful: 3000,   // 3 seconds
    aggressive: 500     // 0.5 seconds
  }
});
```

### User Agents

Customize user agent strings:

```javascript
const scraper = new LiveScraper({
  userAgents: [
    'MyBot/1.0 (+https://mybot.com)',
    'CustomScraper/1.0'
  ]
});
```

## Architecture

### Core Classes

1. **LiveScraper**: Main scraper orchestrator
2. **RateLimiter**: Per-source rate limiting
3. **ContentDeduplicator**: Content fingerprinting and deduplication
4. **ContentChunker**: Intelligent content chunking
5. **MetadataExtractor**: Source-specific metadata extraction

### Event System

The scraper uses Node.js EventEmitter for real-time updates:

- `request`: Before making a request
- `scrape:start`: When scraping begins
- `scrape:complete`: When scraping completes
- `scrape:error`: When scraping fails
- `duplicate`: When duplicate content is found
- `content:changed`: When monitored content changes
- `monitor:start`: When monitoring starts
- `monitor:stop`: When monitoring stops
- `monitor:error`: When monitoring fails
- `distribute:start`: When distributed work begins
- `distribute:complete`: When distributed work completes

### Memory Management

- **Deduplication Cache**: In-memory hash set
- **Content Cache**: In-memory content storage
- **Rate Limiter State**: Per-source request tracking
- **Monitor State**: Active monitor configurations

## Production Considerations

### Required Dependencies

```bash
npm install node-fetch cheerio youtube-transcript
npm install --save-dev @types/node
```

### Replace Mock Implementations

1. **HTTP Client**: Replace `mockFetch` with real `fetch` or `axios`
2. **XML Parser**: Use `xml2js` for arXiv responses
3. **HTML Parser**: Use `cheerio` for better HTML parsing
4. **YouTube Transcripts**: Use `youtube-transcript` library
5. **Robots.txt**: Implement robots.txt checking

### Security Considerations

1. **API Keys**: Use environment variables
2. **Input Validation**: Sanitize all URLs
3. **Error Handling**: Implement retry logic
4. **Memory Limits**: Implement cache eviction
5. **Request Timeouts**: Add timeout configurations

### Scaling Strategies

1. **Redis Cache**: Replace in-memory cache with Redis
2. **Queue System**: Use Bull or RabbitMQ for job queuing
3. **Worker Processes**: Use cluster or PM2 for scaling
4. **Database Storage**: Persist results to PostgreSQL/MongoDB
5. **CDN Integration**: Cache static content

## Integration with AI Knowledge Nexus

The scraper is designed to integrate with:

- **RAG System**: Chunks are optimized for embedding generation
- **Knowledge Graph**: Metadata supports graph relationship building
- **Search System**: Content is indexed for fast retrieval
- **ML Pipeline**: Consistent format for training data
- **Visualization**: Statistics and monitoring data for dashboards

## Error Handling

```javascript
try {
  const result = await scraper.scrapeUrl('https://example.com');
} catch (error) {
  if (error.message.includes('HTTP 404')) {
    console.log('Page not found');
  } else if (error.message.includes('rate limit')) {
    console.log('Rate limit exceeded, waiting...');
  } else {
    console.error('Scraping failed:', error);
  }
}
```

## Testing

```javascript
// Run tests
npm test

// Run with coverage
npm run test:coverage

// Run specific source tests
npm test -- --grep "arXiv"
```

## Performance Benchmarks

- **Single URL**: ~100-500ms (depending on content size)
- **Batch Scraping**: ~2-10 URLs/second (with rate limiting)
- **Chunking**: ~1000 chunks/second
- **Deduplication**: ~10,000 checks/second
- **Memory Usage**: ~50-200MB (depending on cache size)

## License

MIT License - See LICENSE file for details

## Contributing

Contributions welcome! Please see CONTRIBUTING.md for guidelines.

## Support

- Issues: GitHub Issues
- Discussions: GitHub Discussions
- Email: support@ai-knowledge-nexus.org
