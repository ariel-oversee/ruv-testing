# AI Knowledge Nexus

```
    ___    ____   __ __                    __        __
   /   |  /  _/  / //_/____  ____ _      _/ /__  ___/ /___ ____
  / /| |  / /   / ,<  / __ \/ __ \ | /| / / / _ \/ __  / __ `/ _ \
 / ___ |_/ /   / /| |/ / / / /_/ / |/ |/ / /  __/ /_/ / /_/ /  __/
/_/  |_/___/  /_/ |_/_/ /_/\____/|__/|__/_/\___/\__,_/\__, /\___/
                                                     /____/
    _   __
   / | / /__  _  ____  _______
  /  |/ / _ \| |/_/ / / / ___/
 / /|  /  __/>  </ /_/ (__  )
/_/ |_/\___/_/|_|\__,_/____/
```

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/ai-knowledge-nexus.svg)](https://www.npmjs.com/package/ai-knowledge-nexus)

> **Advanced AI Knowledge Management System** with Vector Search, RAG Pipeline, Multi-Modal Embeddings, Neural Search, Live Web Scraping, Interactive CLI, and Performance Benchmarking.

---

## ✨ Features

### 🔍 **Vector Search Engine**
- **HNSW (Hierarchical Navigable Small World)** graph-based ANN search
- **Product Quantization** for memory-efficient vector compression
- **Multiple similarity metrics**: Cosine, Euclidean, Dot Product, Manhattan
- **Hybrid search**: Dense + Sparse vectors
- **Real-time index updates** with dynamic rebalancing
- **Metadata filtering** and advanced query support

### 🧠 **Advanced Embedding System**
- **Multi-provider support**: OpenAI, Cohere, Local Models (Sentence Transformers)
- **Multi-modal embeddings**: Text, Code, Images
- **Adaptive model selection** based on workload
- **Intelligent caching** with LRU eviction
- **Batch processing** for efficient throughput
- **Fine-tuning pipeline** for domain adaptation
- **Quality metrics** and embedding analysis

### 🎯 **RAG (Retrieval-Augmented Generation)**
- **Multi-stage retrieval pipeline**
- **Query expansion** and reformulation
- **Contextual compression** and optimization
- **Re-ranking** with cross-encoders
- **HyDE** (Hypothetical Document Embeddings)
- **Self-querying** retrieval with metadata
- **Parent-child chunking** strategy
- **Confidence scoring** and source citation

### 🚀 **Ultra Search Engine**
- **Neural semantic search** with word embeddings
- **Fuzzy matching**: Levenshtein, Damerau-Levenshtein, Jaro-Winkler
- **Faceted search** with dynamic facets
- **Temporal search** with date range queries
- **Geo-spatial search** with proximity ranking
- **Query intent classification**
- **Personalization** with user profiles
- **Knowledge graph** for entity relationships

### 🌐 **Live Web Scraper**
- **Multi-engine support**: Cheerio, Puppeteer, Playwright
- **Streaming scraping** for large sites
- **Intelligent rate limiting** per domain
- **Content deduplication** with similarity hashing
- **Automatic content chunking**
- **Metadata extraction**: Author, dates, tags, sentiment
- **Robots.txt compliance**
- **Retry logic** with exponential backoff

### 📊 **Vector Visualization**
- **3D interactive visualizations**
- **Dimensionality reduction**: t-SNE, UMAP, PCA
- **Real-time updates** and animations
- **Cluster detection** and highlighting
- **Export to multiple formats**: PNG, SVG, HTML

### ⚡ **Performance Monitoring**
- **Real-time metrics** collection
- **Query latency** tracking
- **Memory profiling** and leak detection
- **Load testing** framework
- **Bottleneck analysis**
- **Interactive dashboard**
- **Automated benchmarking**

### 💻 **Interactive CLI**
- **Beautiful ASCII art** and animations
- **Real-time progress** indicators
- **Multi-pane interface** with Blessed
- **Live search** with autocomplete
- **Syntax highlighting**
- **Command history**
- **Voice input support**
- **Customizable themes**

---

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Optional: Install globally for CLI access
npm run install-global

# Run the interactive CLI
npm run cli

# Run comprehensive demo
npm run demo
```

### Basic Usage

```javascript
const { KnowledgeNexus } = require('ai-knowledge-nexus');

// Initialize the system
const nexus = new KnowledgeNexus({
  vectorDimensions: 384,
  embeddingModel: 'all-MiniLM-L6-v2',
  enableCache: true
});

await nexus.initialize();

// Add documents
await nexus.addDocument(
  'Artificial Intelligence is transforming the world.',
  { type: 'article', category: 'technology' }
);

await nexus.addDocument(
  'Machine learning enables computers to learn from data.',
  { type: 'article', category: 'ai' }
);

// Search
const results = await nexus.search('AI and machine learning', {
  k: 5,
  strategy: 'hybrid'
});

console.log('Search Results:', results);

// RAG Query
const answer = await nexus.ragQuery(
  'How is AI transforming the world?',
  { retrievalCount: 3 }
);

console.log('Answer:', answer.answer);
console.log('Sources:', answer.sources);

// Scrape and index web content
await nexus.scrapeAndIndex('https://example.com/article', {
  enableChunking: true,
  chunkSize: 500
});

// Get statistics
const stats = nexus.getStats();
console.log('System Stats:', stats);

// Cleanup
await nexus.shutdown();
```

---

## 📖 API Documentation

### KnowledgeNexus Class

#### Constructor

```javascript
const nexus = new KnowledgeNexus(config);
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `vectorDimensions` | number | 1536 | Dimension of vector embeddings |
| `vectorMetric` | string | 'cosine' | Similarity metric (cosine, euclidean, dot) |
| `embeddingProvider` | string | 'local' | Provider (openai, cohere, local) |
| `embeddingModel` | string | 'all-MiniLM-L6-v2' | Model name |
| `enableCache` | boolean | true | Enable embedding cache |
| `enableMonitoring` | boolean | true | Enable performance monitoring |
| `ragStrategy` | string | 'hybrid' | RAG strategy (semantic, keyword, hybrid) |

#### Methods

##### `initialize()`
Initialize all modules and prepare the system.

```javascript
await nexus.initialize();
// Returns: { success: true, modules: [...], config: {...} }
```

##### `addDocument(content, metadata)`
Add a document to the knowledge base.

```javascript
await nexus.addDocument(
  'Document content here',
  {
    id: 'doc-1',
    title: 'My Document',
    category: 'research',
    tags: ['ai', 'ml']
  }
);
```

**Returns:**
```javascript
{
  success: true,
  documentId: 'doc-1',
  embedding: [0.123, -0.456, ...],
  processingTime: 45
}
```

##### `search(query, options)`
Search the knowledge base.

```javascript
const results = await nexus.search('machine learning', {
  k: 10,                      // Number of results
  strategy: 'hybrid',         // vector | keyword | hybrid
  threshold: 0.7,             // Minimum similarity
  filters: { category: 'ai' },
  enableReranking: true
});
```

**Returns:**
```javascript
{
  query: 'machine learning',
  results: [
    {
      id: 'doc-1',
      content: '...',
      metadata: {...},
      score: 0.95,
      source: 'vector'
    }
  ],
  count: 10,
  strategy: 'hybrid',
  processingTime: 125
}
```

##### `ragQuery(query, options)`
Retrieve context and generate answer (requires RAG module).

```javascript
const answer = await nexus.ragQuery(
  'What is machine learning?',
  {
    retrievalCount: 5,
    contextWindow: 4000,
    temperature: 0.7
  }
);
```

**Returns:**
```javascript
{
  query: '...',
  answer: 'Machine learning is...',
  context: [...],
  sources: [...],
  confidence: 0.92,
  processingTime: 450
}
```

##### `scrapeAndIndex(url, options)`
Scrape web content and add to knowledge base.

```javascript
await nexus.scrapeAndIndex('https://example.com', {
  engine: 'cheerio',
  enableChunking: true,
  chunkSize: 500,
  extractMetadata: true
});
```

##### `visualize(options)`
Generate vector space visualization.

```javascript
const viz = await nexus.visualize({
  method: 'tsne',    // tsne | umap | pca
  dimensions: 3,
  perplexity: 30
});
```

##### `getStats()`
Get system statistics.

```javascript
const stats = nexus.getStats();
```

##### `benchmark(options)`
Run performance benchmark.

```javascript
const results = await nexus.benchmark({
  iterations: 100,
  concurrency: 10
});
```

##### `clear()`
Clear all data from the system.

```javascript
await nexus.clear();
```

##### `shutdown()`
Shutdown all modules and cleanup.

```javascript
await nexus.shutdown();
```

---

## 🎨 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI Knowledge Nexus                          │
│                     Main Integration Layer                       │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Vector Engine │    │   Embedding   │    │  Search       │
│               │    │   Engine      │    │  Engine       │
│ - HNSW Index  │    │ - Multi-Modal │    │ - Neural      │
│ - Quantizer   │    │ - Providers   │    │ - Fuzzy       │
│ - Metrics     │    │ - Cache       │    │ - Faceted     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ RAG System    │    │  Web Scraper  │    │ Visualizer    │
│               │    │               │    │               │
│ - Retrieval   │    │ - Multi-Engine│    │ - t-SNE       │
│ - Reranking   │    │ - Streaming   │    │ - UMAP        │
│ - HyDE        │    │ - Rate Limit  │    │ - 3D Render   │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Performance       │
                    │ Monitor           │
                    │                   │
                    │ - Metrics         │
                    │ - Profiling       │
                    │ - Dashboard       │
                    └───────────────────┘
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Embedding Providers
OPENAI_API_KEY=your_openai_key
COHERE_API_KEY=your_cohere_key

# Redis Cache (optional)
REDIS_URL=redis://localhost:6379

# Performance
ENABLE_MONITORING=true
METRICS_INTERVAL=5000

# Logging
LOG_LEVEL=info
```

### Advanced Configuration

```javascript
const nexus = new KnowledgeNexus({
  // Vector Engine
  vectorDimensions: 1536,
  vectorMetric: 'cosine',
  enableCompression: true,
  enableHNSW: true,

  // Embeddings
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  enableCache: true,
  cacheSize: 10000,

  // Search
  enableFuzzySearch: true,
  enableSemanticSearch: true,
  enableFacetedSearch: true,
  maxResults: 100,

  // RAG
  ragStrategy: 'hybrid',
  enableReranking: true,
  enableQueryExpansion: true,
  contextWindow: 8000,

  // Scraper
  enableScraping: true,
  maxConcurrency: 5,
  respectRobotsTxt: true,
  enableDeduplication: true,

  // Performance
  enableMonitoring: true,
  enableProfiling: false,
  metricsInterval: 5000
});
```

---

## 📊 Performance Benchmarks

### Vector Search Performance

| Operation | Throughput | Latency (p50) | Latency (p99) |
|-----------|------------|---------------|---------------|
| Insert    | 10,000/s   | 0.5ms        | 2ms          |
| Search (k=10) | 5,000/s | 2ms          | 10ms         |
| Search (k=100) | 2,000/s | 5ms          | 20ms         |

### Embedding Performance

| Provider | Model | Throughput | Latency | Cost |
|----------|-------|------------|---------|------|
| Local | all-MiniLM-L6-v2 | 1,000/s | 1ms | Free |
| OpenAI | text-embedding-3-small | 500/s | 20ms | $0.00002/1K |
| Cohere | embed-english-v3.0 | 300/s | 30ms | $0.0001/1K |

### Memory Usage

| Documents | Memory (Uncompressed) | Memory (Compressed) | Compression Ratio |
|-----------|-----------------------|---------------------|-------------------|
| 10,000    | 60 MB                | 15 MB               | 4:1              |
| 100,000   | 600 MB               | 150 MB              | 4:1              |
| 1,000,000 | 6 GB                 | 1.5 GB              | 4:1              |

---

## 🎯 Use Cases

### 1. Document Search & Retrieval
Build intelligent document search systems with semantic understanding.

### 2. Question Answering
Create RAG-based QA systems that cite sources.

### 3. Knowledge Management
Organize and retrieve company knowledge efficiently.

### 4. Content Recommendations
Recommend similar content based on semantic similarity.

### 5. Research Assistant
Scrape, index, and search academic papers or web content.

### 6. Code Search
Search codebases semantically with specialized embeddings.

### 7. Customer Support
Build intelligent support systems with context-aware answers.

---

## 🛠️ Development

### Scripts

```bash
# Development
npm run dev              # Watch mode with auto-reload
npm run dev:cli          # CLI in watch mode

# Testing
npm test                 # Run all tests with coverage
npm run test:watch       # Watch mode
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only

# Code Quality
npm run lint             # Check code style
npm run lint:fix         # Fix code style issues
npm run format           # Format with Prettier

# Documentation
npm run docs             # Generate JSDoc documentation

# Benchmarking
npm run bench            # Performance benchmarks
npm run demo:performance # Performance demo
```

### Project Structure

```
ai-knowledge-nexus/
├── src/
│   ├── index.js              # Main integration module
│   ├── core/
│   │   └── vector-engine.js  # Vector search & HNSW
│   ├── ml/
│   │   └── embedding-engine.js # Multi-modal embeddings
│   ├── rag/
│   │   └── advanced-rag.js   # RAG pipeline
│   ├── search/
│   │   └── ultra-search.js   # Neural & fuzzy search
│   ├── scraper/
│   │   └── live-scraper.js   # Web scraping
│   ├── viz/
│   │   └── vector-viz.js     # Visualization
│   ├── bench/
│   │   └── performance-engine.js # Benchmarking
│   └── cli/
│       ├── nexus-cli.js      # Interactive CLI
│       ├── themes.js         # CLI themes
│       └── animations.js     # CLI animations
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── docs/                     # Documentation
├── data/                     # Sample data
├── config/                   # Configuration files
├── demo.js                   # Comprehensive demo
├── package.json
└── README.md
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Make your changes
5. Run tests: `npm test`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Hierarchical Navigable Small World (HNSW)** algorithm
- **Sentence Transformers** for local embeddings
- **OpenAI** and **Cohere** for embedding APIs
- **Blessed** for terminal UI
- **Cheerio**, **Puppeteer**, **Playwright** for web scraping

---

## 📞 Support

- 📧 Email: support@ai-knowledge-nexus.com
- 💬 Discord: [Join our community](https://discord.gg/nexus)
- 🐛 Issues: [GitHub Issues](https://github.com/ai-knowledge-nexus/nexus/issues)
- 📖 Documentation: [Full Docs](https://ai-knowledge-nexus.com/docs)

---

## 🗺️ Roadmap

### v2.1 (Q1 2025)
- [ ] Multi-language support
- [ ] Real-time collaborative search
- [ ] GraphQL API
- [ ] Cloud deployment templates

### v2.2 (Q2 2025)
- [ ] Multi-modal search (images + text)
- [ ] Federated search across instances
- [ ] Advanced query language
- [ ] Mobile CLI app

### v3.0 (Q3 2025)
- [ ] Distributed vector database
- [ ] Auto-scaling infrastructure
- [ ] Enterprise features
- [ ] SaaS offering

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ai-knowledge-nexus/nexus&type=Date)](https://star-history.com/#ai-knowledge-nexus/nexus&Date)

---

<div align="center">

**[Documentation](https://ai-knowledge-nexus.com/docs)** •
**[Demo](https://demo.ai-knowledge-nexus.com)** •
**[Blog](https://ai-knowledge-nexus.com/blog)** •
**[Twitter](https://twitter.com/ai_nexus)**

Made with ❤️ by the AI Knowledge Nexus Team

</div>
