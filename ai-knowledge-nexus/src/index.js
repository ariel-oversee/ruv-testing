#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║                    AI KNOWLEDGE NEXUS                                  ║
 * ║                  Main Integration Module                               ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * @module ai-knowledge-nexus
 * @version 2.0.0
 * @description Unified API for AI Knowledge Management System
 *
 * Features:
 * - Vector Search & Storage (HNSW, Product Quantization)
 * - Advanced Embeddings (OpenAI, Cohere, Local Models)
 * - RAG Pipeline (Multi-stage retrieval, Re-ranking, HyDE)
 * - Ultra Search (Neural, Fuzzy, Faceted, Geo-spatial)
 * - Live Web Scraping (Streaming, Rate Limiting, Deduplication)
 * - Vector Visualization (3D, t-SNE, UMAP, PCA)
 * - Performance Benchmarking (Load Testing, Monitoring)
 * - Interactive CLI (Beautiful TUI, Real-time Updates)
 */

const EventEmitter = require('events');

// ============================================================================
// CORE MODULES
// ============================================================================

const {
  VectorEngine,
  HNSWIndex,
  ProductQuantizer,
  SparseVector,
  SimilarityMetrics
} = require('./core/vector-engine');

const {
  EmbeddingEngine,
  EMBEDDING_MODELS,
  EmbeddingCache,
  AdaptiveModelSelector,
  BatchProcessor,
  EmbeddingQualityMetrics,
  FineTuningPipeline,
  EmbeddingError
} = require('./ml/embedding-engine');

const {
  UltraSearchEngine,
  SemanticNeuralNetwork,
  QueryIntentClassifier,
  levenshteinDistance,
  damerauLevenshteinDistance
} = require('./search/ultra-search');

// Note: RAG module uses ES6 imports, we'll handle it differently
let AdvancedRAG, ParentChildChunker, QueryRouter, RAGMonitor, QueryType, RetrievalStrategy;
try {
  const ragModule = require('./rag/advanced-rag');
  if (ragModule.default) {
    ({ AdvancedRAG, ParentChildChunker, QueryRouter, RAGMonitor, QueryType, RetrievalStrategy } = ragModule.default);
  }
} catch (err) {
  console.warn('RAG module not available (ES6 module):', err.message);
}

// Scraper module (ES6)
let LiveScraper, RateLimiter, ContentDeduplicator, ContentChunker, MetadataExtractor, SCRAPER_CONFIG;
try {
  const scraperModule = require('./scraper/live-scraper');
  if (scraperModule.default) {
    LiveScraper = scraperModule.default;
    ({ RateLimiter, ContentDeduplicator, ContentChunker, MetadataExtractor, SCRAPER_CONFIG } = scraperModule);
  }
} catch (err) {
  console.warn('Scraper module not available (ES6 module):', err.message);
}

// Visualization module (ES6)
let VectorVisualizer;
try {
  const vizModule = require('./viz/vector-viz');
  VectorVisualizer = vizModule.default || vizModule.VectorVisualizer;
} catch (err) {
  console.warn('Visualization module not available (ES6 module):', err.message);
}

const {
  PerformanceEngine,
  runExamples: runBenchmarkExamples
} = require('./bench/performance-engine');

// ============================================================================
// UNIFIED NEXUS API
// ============================================================================

/**
 * Main Knowledge Nexus class integrating all modules
 */
class KnowledgeNexus extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // Vector Engine Configuration
      vectorDimensions: 1536,
      vectorMetric: 'cosine',
      enableCompression: true,
      enableHNSW: true,

      // Embedding Configuration
      embeddingProvider: 'local',
      embeddingModel: 'all-MiniLM-L6-v2',
      embeddingDimensions: 384,
      enableCache: true,
      cacheSize: 10000,

      // Search Configuration
      enableFuzzySearch: true,
      enableSemanticSearch: true,
      enableFacetedSearch: true,
      maxResults: 100,

      // RAG Configuration
      ragStrategy: 'hybrid',
      enableReranking: true,
      enableQueryExpansion: true,
      contextWindow: 8000,

      // Scraper Configuration
      enableScraping: true,
      maxConcurrency: 5,
      respectRobotsTxt: true,
      enableDeduplication: true,

      // Performance Configuration
      enableMonitoring: true,
      enableProfiling: false,
      metricsInterval: 5000,

      ...config
    };

    this.initialized = false;
    this.modules = {};
  }

  /**
   * Initialize all modules
   */
  async initialize() {
    if (this.initialized) {
      throw new Error('KnowledgeNexus already initialized');
    }

    try {
      // Initialize Vector Engine
      this.modules.vectorEngine = new VectorEngine({
        dimensions: this.config.vectorDimensions,
        metric: this.config.vectorMetric,
        enableCompression: this.config.enableCompression
      });

      // Initialize Embedding Engine
      this.modules.embeddingEngine = new EmbeddingEngine({
        provider: this.config.embeddingProvider,
        model: this.config.embeddingModel,
        dimensions: this.config.embeddingDimensions,
        enableCache: this.config.enableCache,
        cacheSize: this.config.cacheSize
      });

      // Initialize Search Engine
      this.modules.searchEngine = new UltraSearchEngine({
        fuzzyThreshold: 0.8,
        semanticThreshold: 0.7,
        maxResults: this.config.maxResults
      });

      // Initialize RAG System (if available)
      if (AdvancedRAG) {
        this.modules.ragSystem = new AdvancedRAG({
          strategy: this.config.ragStrategy,
          enableReranking: this.config.enableReranking,
          enableQueryExpansion: this.config.enableQueryExpansion,
          contextWindow: this.config.contextWindow
        });
      }

      // Initialize Scraper (if available)
      if (LiveScraper && this.config.enableScraping) {
        this.modules.scraper = new LiveScraper({
          maxConcurrency: this.config.maxConcurrency,
          respectRobotsTxt: this.config.respectRobotsTxt,
          enableDeduplication: this.config.enableDeduplication
        });
      }

      // Initialize Visualizer (if available)
      if (VectorVisualizer) {
        this.modules.visualizer = new VectorVisualizer({
          dimensions: this.config.vectorDimensions,
          enableInteractive: false
        });
      }

      // Initialize Performance Monitor
      if (this.config.enableMonitoring) {
        this.modules.performanceEngine = new PerformanceEngine({
          enableProfiling: this.config.enableProfiling,
          metricsInterval: this.config.metricsInterval
        });
        this.modules.performanceEngine.startMonitoring();
      }

      this.initialized = true;
      this.emit('initialized', { modules: Object.keys(this.modules) });

      return {
        success: true,
        modules: Object.keys(this.modules),
        config: this.config
      };

    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize KnowledgeNexus: ${error.message}`);
    }
  }

  /**
   * Add document to the knowledge base
   */
  async addDocument(content, metadata = {}) {
    this.ensureInitialized();

    const docId = metadata.id || this.generateId();
    const startTime = Date.now();

    try {
      // Generate embedding
      const embedding = await this.modules.embeddingEngine.embed(content);

      // Store in vector engine
      await this.modules.vectorEngine.insert(docId, embedding.embedding, {
        ...metadata,
        content,
        timestamp: Date.now()
      });

      // Index in search engine
      await this.modules.searchEngine.indexDocument({
        id: docId,
        content,
        ...metadata
      });

      // Track performance
      if (this.modules.performanceEngine) {
        await this.modules.performanceEngine.recordQuery('addDocument', Date.now() - startTime);
      }

      this.emit('documentAdded', { docId, content, metadata, time: Date.now() - startTime });

      return {
        success: true,
        documentId: docId,
        embedding: embedding.embedding,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.emit('error', { operation: 'addDocument', error });
      throw error;
    }
  }

  /**
   * Search the knowledge base
   */
  async search(query, options = {}) {
    this.ensureInitialized();

    const startTime = Date.now();
    const {
      k = 10,
      strategy = 'hybrid',
      threshold = 0.7,
      filters = {},
      enableReranking = true
    } = options;

    try {
      let results = [];

      if (strategy === 'vector' || strategy === 'hybrid') {
        // Vector search
        const queryEmbedding = await this.modules.embeddingEngine.embed(query);
        const vectorResults = await this.modules.vectorEngine.search(
          queryEmbedding.embedding,
          k,
          filters
        );
        results = vectorResults.map(r => ({
          ...r,
          source: 'vector'
        }));
      }

      if (strategy === 'keyword' || strategy === 'hybrid') {
        // Keyword search
        const keywordResults = await this.modules.searchEngine.search(query, {
          limit: k,
          fuzzy: true
        });

        if (strategy === 'hybrid') {
          // Merge results
          results = this.mergeResults(results, keywordResults.map(r => ({
            ...r,
            source: 'keyword'
          })));
        } else {
          results = keywordResults;
        }
      }

      // Apply threshold filtering
      results = results.filter(r => (r.score || r.similarity || 0) >= threshold);

      // Re-ranking (if RAG available and enabled)
      if (enableReranking && this.modules.ragSystem && results.length > 0) {
        results = await this.modules.ragSystem.rerank(query, results);
      }

      // Limit results
      results = results.slice(0, k);

      // Track performance
      if (this.modules.performanceEngine) {
        await this.modules.performanceEngine.recordQuery('search', Date.now() - startTime);
      }

      this.emit('searchCompleted', {
        query,
        resultCount: results.length,
        strategy,
        time: Date.now() - startTime
      });

      return {
        query,
        results,
        count: results.length,
        strategy,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.emit('error', { operation: 'search', error });
      throw error;
    }
  }

  /**
   * RAG Query - Retrieve and generate answer
   */
  async ragQuery(query, options = {}) {
    this.ensureInitialized();

    if (!this.modules.ragSystem) {
      throw new Error('RAG system not available');
    }

    const startTime = Date.now();

    try {
      // Search for relevant context
      const searchResults = await this.search(query, {
        k: options.retrievalCount || 5,
        strategy: 'hybrid',
        enableReranking: true
      });

      // Prepare context
      const context = searchResults.results.map(r => ({
        content: r.metadata?.content || r.content,
        metadata: r.metadata,
        score: r.score || r.similarity
      }));

      // Generate response using RAG
      const ragResult = await this.modules.ragSystem.query(query, {
        context,
        ...options
      });

      // Track performance
      if (this.modules.performanceEngine) {
        await this.modules.performanceEngine.recordQuery('ragQuery', Date.now() - startTime);
      }

      this.emit('ragQueryCompleted', {
        query,
        contextDocuments: context.length,
        time: Date.now() - startTime
      });

      return {
        query,
        answer: ragResult.answer,
        context,
        sources: ragResult.sources,
        confidence: ragResult.confidence,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.emit('error', { operation: 'ragQuery', error });
      throw error;
    }
  }

  /**
   * Scrape and index web content
   */
  async scrapeAndIndex(url, options = {}) {
    this.ensureInitialized();

    if (!this.modules.scraper) {
      throw new Error('Scraper module not available');
    }

    const startTime = Date.now();

    try {
      // Scrape content
      const scrapedData = await this.modules.scraper.scrape(url, options);

      // Index each content chunk
      const results = [];
      for (const chunk of scrapedData.chunks || [scrapedData]) {
        const result = await this.addDocument(chunk.content, {
          url,
          title: chunk.title || scrapedData.title,
          source: 'web-scraping',
          scrapedAt: Date.now(),
          ...chunk.metadata
        });
        results.push(result);
      }

      this.emit('scrapeCompleted', {
        url,
        documentsIndexed: results.length,
        time: Date.now() - startTime
      });

      return {
        url,
        documentsIndexed: results.length,
        results,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      this.emit('error', { operation: 'scrapeAndIndex', error });
      throw error;
    }
  }

  /**
   * Visualize vector space
   */
  async visualize(options = {}) {
    this.ensureInitialized();

    if (!this.modules.visualizer) {
      throw new Error('Visualizer module not available');
    }

    try {
      // Get all vectors from engine
      const vectors = await this.modules.vectorEngine.getAllVectors();

      // Generate visualization
      const visualization = await this.modules.visualizer.visualize(vectors, options);

      this.emit('visualizationGenerated', {
        vectorCount: vectors.length,
        method: options.method || 'tsne'
      });

      return visualization;

    } catch (error) {
      this.emit('error', { operation: 'visualize', error });
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  getStats() {
    this.ensureInitialized();

    const stats = {
      modules: Object.keys(this.modules),
      vectorEngine: this.modules.vectorEngine?.getStats() || {},
      searchEngine: this.modules.searchEngine?.getStats() || {},
      embeddingEngine: this.modules.embeddingEngine?.getStats() || {},
      performance: this.modules.performanceEngine?.getDashboardData() || {}
    };

    if (this.modules.ragSystem) {
      stats.ragSystem = this.modules.ragSystem.getMetrics();
    }

    if (this.modules.scraper) {
      stats.scraper = this.modules.scraper.getStats();
    }

    return stats;
  }

  /**
   * Run performance benchmark
   */
  async benchmark(options = {}) {
    this.ensureInitialized();

    if (!this.modules.performanceEngine) {
      throw new Error('Performance engine not available');
    }

    return await this.modules.performanceEngine.runBenchmark('nexus-operations', async () => {
      // Test document addition
      await this.addDocument('Sample document for benchmarking', {
        type: 'benchmark',
        timestamp: Date.now()
      });

      // Test search
      await this.search('sample query', { k: 5 });
    }, options);
  }

  /**
   * Clear all data
   */
  async clear() {
    this.ensureInitialized();

    await this.modules.vectorEngine?.clear();
    await this.modules.searchEngine?.clear?.();
    await this.modules.embeddingEngine?.clearCache?.();

    this.emit('cleared');

    return { success: true };
  }

  /**
   * Shutdown all modules
   */
  async shutdown() {
    if (!this.initialized) return;

    try {
      if (this.modules.performanceEngine) {
        this.modules.performanceEngine.shutdown();
      }

      if (this.modules.scraper) {
        await this.modules.scraper.shutdown();
      }

      this.removeAllListeners();
      this.initialized = false;

      this.emit('shutdown');

      return { success: true };

    } catch (error) {
      throw new Error(`Failed to shutdown: ${error.message}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('KnowledgeNexus not initialized. Call initialize() first.');
    }
  }

  generateId() {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  mergeResults(results1, results2) {
    const merged = [...results1];
    const ids = new Set(results1.map(r => r.id));

    for (const result of results2) {
      if (!ids.has(result.id)) {
        merged.push(result);
      }
    }

    // Sort by score/similarity
    return merged.sort((a, b) => {
      const scoreA = a.score || a.similarity || 0;
      const scoreB = b.score || b.similarity || 0;
      return scoreB - scoreA;
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main API
  KnowledgeNexus,

  // Core Modules
  VectorEngine,
  HNSWIndex,
  ProductQuantizer,
  SparseVector,
  SimilarityMetrics,

  // Embedding Modules
  EmbeddingEngine,
  EMBEDDING_MODELS,
  EmbeddingCache,
  AdaptiveModelSelector,
  BatchProcessor,
  EmbeddingQualityMetrics,
  FineTuningPipeline,
  EmbeddingError,

  // Search Modules
  UltraSearchEngine,
  SemanticNeuralNetwork,
  QueryIntentClassifier,
  levenshteinDistance,
  damerauLevenshteinDistance,

  // RAG Modules (if available)
  AdvancedRAG,
  ParentChildChunker,
  QueryRouter,
  RAGMonitor,
  QueryType,
  RetrievalStrategy,

  // Scraper Modules (if available)
  LiveScraper,
  RateLimiter,
  ContentDeduplicator,
  ContentChunker,
  MetadataExtractor,
  SCRAPER_CONFIG,

  // Visualization
  VectorVisualizer,

  // Performance
  PerformanceEngine,
  runBenchmarkExamples
};

// ============================================================================
// CLI USAGE
// ============================================================================

if (require.main === module) {
  const chalk = require('chalk');
  const figlet = require('figlet');

  console.log(chalk.cyan(figlet.textSync('AI Knowledge Nexus', {
    font: 'Standard',
    horizontalLayout: 'default'
  })));

  console.log(chalk.green('\n✨ AI Knowledge Nexus - Main Module\n'));
  console.log(chalk.yellow('Usage:'));
  console.log('  const { KnowledgeNexus } = require("./src/index.js");');
  console.log('  const nexus = new KnowledgeNexus();');
  console.log('  await nexus.initialize();');
  console.log('  await nexus.addDocument("Hello World", { type: "greeting" });');
  console.log('  const results = await nexus.search("hello");');
  console.log('\n' + chalk.cyan('Available Commands:'));
  console.log('  npm run cli        - Interactive CLI interface');
  console.log('  npm run demo       - Run comprehensive demo');
  console.log('  npm run bench      - Performance benchmarks');
  console.log('  npm run test       - Run test suite');
  console.log();
}
