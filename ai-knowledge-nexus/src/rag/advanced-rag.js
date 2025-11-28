/**
 * Advanced RAG (Retrieval-Augmented Generation) System
 *
 * Features:
 * - Multi-stage retrieval pipeline
 * - Query expansion and reformulation
 * - Contextual compression
 * - Re-ranking with cross-encoders
 * - Hybrid retrieval (semantic + keyword)
 * - Recursive retrieval for complex queries
 * - Source citation tracking
 * - Confidence scoring
 * - Context window optimization
 * - Query routing based on complexity
 * - HyDE (Hypothetical Document Embeddings)
 * - Self-querying retrieval
 * - Parent-child document chunking
 * - Adaptive retrieval based on query type
 */

import { EventEmitter } from 'events';

/**
 * Query Types for Adaptive Routing
 */
export const QueryType = {
  FACTUAL: 'factual',           // Simple fact lookup
  ANALYTICAL: 'analytical',      // Requires analysis
  COMPARATIVE: 'comparative',    // Comparing multiple items
  EXPLORATORY: 'exploratory',    // Open-ended research
  PROCEDURAL: 'procedural',      // Step-by-step instructions
  TEMPORAL: 'temporal',          // Time-based queries
  CAUSAL: 'causal',             // Cause-effect relationships
  OPINION: 'opinion'            // Subjective/opinion-based
};

/**
 * Retrieval Strategies
 */
export const RetrievalStrategy = {
  SEMANTIC: 'semantic',         // Vector similarity
  KEYWORD: 'keyword',           // BM25/TF-IDF
  HYBRID: 'hybrid',             // Combined approach
  HYDE: 'hyde',                 // Hypothetical document embeddings
  RECURSIVE: 'recursive',       // Multi-hop retrieval
  SELF_QUERY: 'self_query'      // Self-querying with metadata
};

/**
 * Advanced RAG System
 */
export class AdvancedRAG extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      // Vector store configuration
      vectorStore: config.vectorStore,
      embeddingModel: config.embeddingModel,

      // Retrieval parameters
      topK: config.topK || 10,
      minSimilarity: config.minSimilarity || 0.7,
      maxContextTokens: config.maxContextTokens || 4000,

      // Re-ranking configuration
      enableReranking: config.enableReranking !== false,
      rerankTopK: config.rerankTopK || 5,

      // Hybrid search weights
      semanticWeight: config.semanticWeight || 0.7,
      keywordWeight: config.keywordWeight || 0.3,

      // Query processing
      enableQueryExpansion: config.enableQueryExpansion !== false,
      enableHyDE: config.enableHyDE !== false,
      maxExpansions: config.maxExpansions || 3,

      // Chunking strategy
      chunkSize: config.chunkSize || 512,
      chunkOverlap: config.chunkOverlap || 128,
      enableParentChild: config.enableParentChild !== false,

      // Advanced features
      enableRecursive: config.enableRecursive !== false,
      maxRecursionDepth: config.maxRecursionDepth || 3,
      confidenceThreshold: config.confidenceThreshold || 0.5,

      // LLM for generation
      llm: config.llm,

      ...config
    };

    // Internal state
    this.queryCache = new Map();
    this.performanceMetrics = {
      totalQueries: 0,
      avgRetrievalTime: 0,
      avgGenerationTime: 0,
      cacheHits: 0
    };
  }

  /**
   * Main query interface
   */
  async query(userQuery, options = {}) {
    const startTime = Date.now();
    this.emit('query:start', { query: userQuery });

    try {
      // 1. Query routing and classification
      const queryType = await this.classifyQuery(userQuery);
      this.emit('query:classified', { query: userQuery, type: queryType });

      // 2. Route to appropriate retrieval strategy
      const strategy = this.selectStrategy(queryType, options);
      this.emit('query:strategy', { strategy });

      // 3. Multi-stage retrieval pipeline
      const retrievalResult = await this.retrieve(userQuery, strategy, options);

      // 4. Generate response with retrieved context
      const response = await this.generate(userQuery, retrievalResult, options);

      // 5. Update metrics
      const totalTime = Date.now() - startTime;
      this.updateMetrics('query', totalTime);

      this.emit('query:complete', {
        query: userQuery,
        response,
        time: totalTime
      });

      return {
        query: userQuery,
        response: response.text,
        sources: response.sources,
        confidence: response.confidence,
        strategy,
        queryType,
        metadata: {
          retrievalTime: retrievalResult.time,
          generationTime: response.time,
          totalTime,
          documentsRetrieved: retrievalResult.documents.length,
          tokensUsed: response.tokensUsed
        }
      };

    } catch (error) {
      this.emit('query:error', { query: userQuery, error });
      throw error;
    }
  }

  /**
   * Query Classification
   * Analyzes query to determine type and complexity
   */
  async classifyQuery(query) {
    const lowerQuery = query.toLowerCase();

    // Pattern matching for query types
    const patterns = {
      [QueryType.FACTUAL]: /^(what is|who is|when|where|define|explain)/i,
      [QueryType.ANALYTICAL]: /(analyze|evaluate|assess|examine|why)/i,
      [QueryType.COMPARATIVE]: /(compare|difference|versus|vs|better)/i,
      [QueryType.PROCEDURAL]: /(how to|steps|process|procedure|guide)/i,
      [QueryType.TEMPORAL]: /(history|timeline|evolution|over time)/i,
      [QueryType.CAUSAL]: /(why|cause|reason|result|effect|impact)/i,
      [QueryType.EXPLORATORY]: /(explore|research|investigate|overview)/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerQuery)) {
        return type;
      }
    }

    // Default to analytical for complex queries
    return QueryType.ANALYTICAL;
  }

  /**
   * Strategy Selection
   * Selects optimal retrieval strategy based on query type
   */
  selectStrategy(queryType, options = {}) {
    if (options.strategy) return options.strategy;

    const strategyMap = {
      [QueryType.FACTUAL]: RetrievalStrategy.SEMANTIC,
      [QueryType.ANALYTICAL]: RetrievalStrategy.HYBRID,
      [QueryType.COMPARATIVE]: RetrievalStrategy.RECURSIVE,
      [QueryType.EXPLORATORY]: RetrievalStrategy.HYDE,
      [QueryType.PROCEDURAL]: RetrievalStrategy.SEMANTIC,
      [QueryType.TEMPORAL]: RetrievalStrategy.SELF_QUERY,
      [QueryType.CAUSAL]: RetrievalStrategy.RECURSIVE,
      [QueryType.OPINION]: RetrievalStrategy.HYBRID
    };

    return strategyMap[queryType] || RetrievalStrategy.HYBRID;
  }

  /**
   * Multi-stage Retrieval Pipeline
   */
  async retrieve(query, strategy, options = {}) {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = `${query}:${strategy}`;
    if (this.queryCache.has(cacheKey)) {
      this.performanceMetrics.cacheHits++;
      return this.queryCache.get(cacheKey);
    }

    let documents = [];

    switch (strategy) {
      case RetrievalStrategy.SEMANTIC:
        documents = await this.semanticRetrieval(query, options);
        break;

      case RetrievalStrategy.KEYWORD:
        documents = await this.keywordRetrieval(query, options);
        break;

      case RetrievalStrategy.HYBRID:
        documents = await this.hybridRetrieval(query, options);
        break;

      case RetrievalStrategy.HYDE:
        documents = await this.hydeRetrieval(query, options);
        break;

      case RetrievalStrategy.RECURSIVE:
        documents = await this.recursiveRetrieval(query, options);
        break;

      case RetrievalStrategy.SELF_QUERY:
        documents = await this.selfQueryRetrieval(query, options);
        break;

      default:
        documents = await this.hybridRetrieval(query, options);
    }

    // Post-processing pipeline
    documents = await this.postProcess(documents, query, options);

    const result = {
      documents,
      strategy,
      time: Date.now() - startTime
    };

    // Cache result
    this.queryCache.set(cacheKey, result);

    return result;
  }

  /**
   * Semantic Retrieval (Vector Similarity)
   */
  async semanticRetrieval(query, options = {}) {
    this.emit('retrieval:semantic:start', { query });

    // Expand query if enabled
    const queries = this.config.enableQueryExpansion
      ? await this.expandQuery(query)
      : [query];

    // Retrieve for each query variant
    const allDocs = [];
    for (const q of queries) {
      const embedding = await this.embedQuery(q);
      const docs = await this.vectorStore.similaritySearch(
        embedding,
        this.config.topK
      );
      allDocs.push(...docs);
    }

    // Deduplicate and merge
    return this.deduplicateDocuments(allDocs);
  }

  /**
   * Keyword Retrieval (BM25/TF-IDF)
   */
  async keywordRetrieval(query, options = {}) {
    this.emit('retrieval:keyword:start', { query });

    // Tokenize query
    const tokens = this.tokenize(query);

    // BM25 scoring
    const documents = await this.vectorStore.keywordSearch(
      tokens,
      this.config.topK
    );

    return documents.map(doc => ({
      ...doc,
      score: this.calculateBM25Score(tokens, doc)
    }));
  }

  /**
   * Hybrid Retrieval (Semantic + Keyword)
   */
  async hybridRetrieval(query, options = {}) {
    this.emit('retrieval:hybrid:start', { query });

    // Parallel retrieval
    const [semanticDocs, keywordDocs] = await Promise.all([
      this.semanticRetrieval(query, options),
      this.keywordRetrieval(query, options)
    ]);

    // Fusion with weighted scoring
    return this.fuseResults(semanticDocs, keywordDocs);
  }

  /**
   * HyDE (Hypothetical Document Embeddings)
   * Generate hypothetical answer, then search for similar documents
   */
  async hydeRetrieval(query, options = {}) {
    this.emit('retrieval:hyde:start', { query });

    // Generate hypothetical document
    const hypotheticalDoc = await this.generateHypotheticalDocument(query);

    // Use hypothetical document for retrieval
    const embedding = await this.embedQuery(hypotheticalDoc);
    const documents = await this.vectorStore.similaritySearch(
      embedding,
      this.config.topK
    );

    return documents;
  }

  /**
   * Recursive Retrieval
   * Multi-hop retrieval for complex queries
   */
  async recursiveRetrieval(query, options = {}, depth = 0) {
    this.emit('retrieval:recursive:start', { query, depth });

    if (depth >= this.config.maxRecursionDepth) {
      return [];
    }

    // Initial retrieval
    const initialDocs = await this.semanticRetrieval(query, options);

    // Extract follow-up queries from initial results
    const followUpQueries = await this.extractFollowUpQueries(
      query,
      initialDocs
    );

    // Recursive retrieval for follow-ups
    const recursiveDocs = [];
    for (const followUp of followUpQueries) {
      const docs = await this.recursiveRetrieval(
        followUp,
        options,
        depth + 1
      );
      recursiveDocs.push(...docs);
    }

    // Combine and deduplicate
    return this.deduplicateDocuments([...initialDocs, ...recursiveDocs]);
  }

  /**
   * Self-Querying Retrieval
   * Extract metadata filters from query
   */
  async selfQueryRetrieval(query, options = {}) {
    this.emit('retrieval:self-query:start', { query });

    // Extract structured query with metadata filters
    const structuredQuery = await this.extractStructuredQuery(query);

    // Apply filters and retrieve
    const documents = await this.vectorStore.filteredSearch(
      structuredQuery.semantic,
      structuredQuery.filters,
      this.config.topK
    );

    return documents;
  }

  /**
   * Post-Processing Pipeline
   */
  async postProcess(documents, query, options = {}) {
    // 1. Re-ranking with cross-encoders
    if (this.config.enableReranking) {
      documents = await this.rerank(documents, query);
    }

    // 2. Contextual compression
    documents = await this.compressContext(documents, query);

    // 3. Confidence scoring
    documents = this.scoreConfidence(documents, query);

    // 4. Context window optimization
    documents = this.optimizeContextWindow(documents);

    // 5. Source citation tracking
    documents = this.trackCitations(documents);

    return documents;
  }

  /**
   * Re-ranking with Cross-Encoders
   */
  async rerank(documents, query) {
    this.emit('rerank:start', { count: documents.length });

    // Score each document with cross-encoder
    const scoredDocs = await Promise.all(
      documents.map(async doc => ({
        ...doc,
        rerankScore: await this.crossEncoderScore(query, doc.content)
      }))
    );

    // Sort by rerank score and take top K
    return scoredDocs
      .sort((a, b) => b.rerankScore - a.rerankScore)
      .slice(0, this.config.rerankTopK);
  }

  /**
   * Contextual Compression
   * Extract only relevant parts of documents
   */
  async compressContext(documents, query) {
    this.emit('compress:start', { count: documents.length });

    return Promise.all(
      documents.map(async doc => {
        const relevantChunks = await this.extractRelevantChunks(
          doc.content,
          query
        );

        return {
          ...doc,
          content: relevantChunks.join('\n\n'),
          compressed: true,
          originalLength: doc.content.length,
          compressedLength: relevantChunks.join('\n\n').length
        };
      })
    );
  }

  /**
   * Confidence Scoring
   */
  scoreConfidence(documents, query) {
    return documents.map(doc => {
      const scores = {
        semantic: doc.score || 0,
        rerank: doc.rerankScore || 0,
        keyword: doc.keywordScore || 0,
        citation: doc.citationCount || 0
      };

      // Weighted confidence calculation
      const confidence = (
        scores.semantic * 0.3 +
        scores.rerank * 0.4 +
        scores.keyword * 0.2 +
        Math.min(scores.citation / 10, 1) * 0.1
      );

      return {
        ...doc,
        confidence,
        confidenceBreakdown: scores
      };
    });
  }

  /**
   * Context Window Optimization
   * Fit documents within token budget
   */
  optimizeContextWindow(documents) {
    const maxTokens = this.config.maxContextTokens;
    let currentTokens = 0;
    const optimized = [];

    for (const doc of documents) {
      const docTokens = this.estimateTokens(doc.content);

      if (currentTokens + docTokens <= maxTokens) {
        optimized.push(doc);
        currentTokens += docTokens;
      } else if (optimized.length === 0) {
        // Include at least one document, truncated if necessary
        const truncated = this.truncateToTokens(doc.content, maxTokens);
        optimized.push({ ...doc, content: truncated, truncated: true });
        break;
      } else {
        break;
      }
    }

    return optimized;
  }

  /**
   * Source Citation Tracking
   */
  trackCitations(documents) {
    return documents.map((doc, index) => ({
      ...doc,
      citationId: `[${index + 1}]`,
      citation: {
        id: doc.id,
        title: doc.metadata?.title || 'Untitled',
        source: doc.metadata?.source || 'Unknown',
        url: doc.metadata?.url,
        timestamp: doc.metadata?.timestamp,
        relevanceScore: doc.confidence
      }
    }));
  }

  /**
   * Query Expansion
   * Generate alternative query formulations
   */
  async expandQuery(query) {
    const expansions = [query];

    // Synonym expansion
    const synonyms = await this.generateSynonyms(query);
    expansions.push(...synonyms.slice(0, 2));

    // Question reformulation
    const reformulated = await this.reformulateQuery(query);
    if (reformulated) expansions.push(reformulated);

    return expansions.slice(0, this.config.maxExpansions);
  }

  /**
   * Generate Hypothetical Document
   * For HyDE retrieval
   */
  async generateHypotheticalDocument(query) {
    const prompt = `Given the question: "${query}", write a detailed, factual passage that would perfectly answer this question. The passage should be informative and specific.`;

    const response = await this.config.llm.generate(prompt, {
      maxTokens: 300,
      temperature: 0.7
    });

    return response.text;
  }

  /**
   * Extract Follow-up Queries
   * For recursive retrieval
   */
  async extractFollowUpQueries(originalQuery, documents) {
    const context = documents
      .slice(0, 3)
      .map(d => d.content)
      .join('\n\n');

    const prompt = `Given the original query: "${originalQuery}" and the initial findings, what 2-3 follow-up questions would help get more comprehensive information? Return only the questions, one per line.`;

    const response = await this.config.llm.generate(prompt, {
      maxTokens: 200,
      temperature: 0.5
    });

    return response.text
      .split('\n')
      .filter(q => q.trim())
      .slice(0, 3);
  }

  /**
   * Extract Structured Query
   * For self-querying retrieval
   */
  async extractStructuredQuery(query) {
    const prompt = `Extract the semantic search query and metadata filters from: "${query}". Return as JSON with keys: semantic (string), filters (object with date, category, author, etc).`;

    const response = await this.config.llm.generate(prompt, {
      maxTokens: 150,
      temperature: 0.3
    });

    try {
      return JSON.parse(response.text);
    } catch {
      return { semantic: query, filters: {} };
    }
  }

  /**
   * Cross-Encoder Scoring
   */
  async crossEncoderScore(query, document) {
    // Placeholder for cross-encoder model
    // In production, use models like ms-marco-MiniLM-L-12-v2
    const combined = `${query} [SEP] ${document}`;
    const embedding = await this.embedQuery(combined);

    // Simplified scoring
    return Math.random() * 0.3 + 0.7; // Mock score
  }

  /**
   * Extract Relevant Chunks
   */
  async extractRelevantChunks(content, query) {
    const sentences = this.splitIntoSentences(content);
    const queryEmbedding = await this.embedQuery(query);

    // Score each sentence
    const scoredSentences = await Promise.all(
      sentences.map(async sentence => ({
        text: sentence,
        score: await this.sentenceSimilarity(sentence, queryEmbedding)
      }))
    );

    // Take top relevant sentences
    return scoredSentences
      .filter(s => s.score > 0.6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.text);
  }

  /**
   * Generate Response with Retrieved Context
   */
  async generate(query, retrievalResult, options = {}) {
    const startTime = Date.now();

    const { documents } = retrievalResult;

    // Build context from documents
    const context = this.buildContext(documents);

    // Generate prompt
    const prompt = this.buildPrompt(query, context, documents);

    // Generate response
    const response = await this.config.llm.generate(prompt, {
      maxTokens: options.maxTokens || 500,
      temperature: options.temperature || 0.7
    });

    // Extract sources
    const sources = documents.map(doc => doc.citation);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(documents, response);

    return {
      text: response.text,
      sources,
      confidence,
      time: Date.now() - startTime,
      tokensUsed: response.tokensUsed || 0
    };
  }

  /**
   * Build Context String
   */
  buildContext(documents) {
    return documents
      .map((doc, i) => `[${i + 1}] ${doc.content}`)
      .join('\n\n---\n\n');
  }

  /**
   * Build Generation Prompt
   */
  buildPrompt(query, context, documents) {
    return `You are a helpful assistant that answers questions based on the provided context. Always cite your sources using [1], [2], etc.

Context:
${context}

Question: ${query}

Instructions:
- Answer the question comprehensively based on the context
- Cite sources for each claim using [number] format
- If the context doesn't contain enough information, acknowledge it
- Be precise and factual

Answer:`;
  }

  /**
   * Calculate Overall Confidence
   */
  calculateOverallConfidence(documents, response) {
    if (documents.length === 0) return 0;

    // Average document confidence
    const avgDocConfidence = documents.reduce(
      (sum, doc) => sum + (doc.confidence || 0),
      0
    ) / documents.length;

    // Citation coverage (how many sources were used)
    const citations = (response.text.match(/\[\d+\]/g) || []).length;
    const citationCoverage = Math.min(citations / 3, 1);

    // Weighted confidence
    return avgDocConfidence * 0.7 + citationCoverage * 0.3;
  }

  /**
   * Fusion Results from Multiple Retrievals
   */
  fuseResults(semanticDocs, keywordDocs) {
    const docMap = new Map();

    // Add semantic results
    semanticDocs.forEach(doc => {
      docMap.set(doc.id, {
        ...doc,
        semanticScore: doc.score || 0,
        keywordScore: 0
      });
    });

    // Merge keyword results
    keywordDocs.forEach(doc => {
      if (docMap.has(doc.id)) {
        docMap.get(doc.id).keywordScore = doc.score || 0;
      } else {
        docMap.set(doc.id, {
          ...doc,
          semanticScore: 0,
          keywordScore: doc.score || 0
        });
      }
    });

    // Calculate fused scores
    return Array.from(docMap.values())
      .map(doc => ({
        ...doc,
        score: (
          doc.semanticScore * this.config.semanticWeight +
          doc.keywordScore * this.config.keywordWeight
        )
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK);
  }

  /**
   * Helper: Embed Query
   */
  async embedQuery(query) {
    return this.config.embeddingModel.embed(query);
  }

  /**
   * Helper: Tokenize
   */
  tokenize(text) {
    return text.toLowerCase()
      .split(/\W+/)
      .filter(token => token.length > 2);
  }

  /**
   * Helper: BM25 Score
   */
  calculateBM25Score(queryTokens, document) {
    // Simplified BM25 implementation
    const k1 = 1.5;
    const b = 0.75;

    const docTokens = this.tokenize(document.content);
    const avgDocLength = 100; // Placeholder
    const docLength = docTokens.length;

    let score = 0;
    queryTokens.forEach(term => {
      const termFreq = docTokens.filter(t => t === term).length;
      const idf = Math.log((1000 - termFreq + 0.5) / (termFreq + 0.5));
      score += idf * ((termFreq * (k1 + 1)) /
        (termFreq + k1 * (1 - b + b * (docLength / avgDocLength))));
    });

    return score;
  }

  /**
   * Helper: Deduplicate Documents
   */
  deduplicateDocuments(documents) {
    const seen = new Set();
    return documents.filter(doc => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });
  }

  /**
   * Helper: Estimate Tokens
   */
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Helper: Truncate to Tokens
   */
  truncateToTokens(text, maxTokens) {
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + '...';
  }

  /**
   * Helper: Split into Sentences
   */
  splitIntoSentences(text) {
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }

  /**
   * Helper: Sentence Similarity
   */
  async sentenceSimilarity(sentence, queryEmbedding) {
    const sentenceEmbedding = await this.embedQuery(sentence);
    return this.cosineSimilarity(sentenceEmbedding, queryEmbedding);
  }

  /**
   * Helper: Cosine Similarity
   */
  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  }

  /**
   * Helper: Generate Synonyms
   */
  async generateSynonyms(query) {
    // Placeholder - would use WordNet or LLM
    return [query];
  }

  /**
   * Helper: Reformulate Query
   */
  async reformulateQuery(query) {
    // Placeholder - would use LLM for reformulation
    return null;
  }

  /**
   * Update Performance Metrics
   */
  updateMetrics(operation, time) {
    this.performanceMetrics.totalQueries++;

    if (operation === 'query') {
      this.performanceMetrics.avgRetrievalTime =
        (this.performanceMetrics.avgRetrievalTime *
         (this.performanceMetrics.totalQueries - 1) + time) /
        this.performanceMetrics.totalQueries;
    }
  }

  /**
   * Get Performance Metrics
   */
  getMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.queryCache.size,
      cacheHitRate: this.performanceMetrics.cacheHits /
        Math.max(this.performanceMetrics.totalQueries, 1)
    };
  }

  /**
   * Clear Cache
   */
  clearCache() {
    this.queryCache.clear();
  }
}

/**
 * Parent-Child Document Chunker
 * Implements hierarchical document structure
 */
export class ParentChildChunker {
  constructor(config = {}) {
    this.parentChunkSize = config.parentChunkSize || 2048;
    this.childChunkSize = config.childChunkSize || 512;
    this.childOverlap = config.childOverlap || 128;
  }

  /**
   * Chunk document into parent-child hierarchy
   */
  chunk(document) {
    const parents = this.createParentChunks(document);

    return parents.map((parent, parentIdx) => {
      const children = this.createChildChunks(parent.content);

      return {
        parent: {
          ...parent,
          id: `${document.id}_p${parentIdx}`
        },
        children: children.map((child, childIdx) => ({
          ...child,
          id: `${document.id}_p${parentIdx}_c${childIdx}`,
          parentId: `${document.id}_p${parentIdx}`
        }))
      };
    });
  }

  /**
   * Create parent chunks
   */
  createParentChunks(document) {
    const chunks = [];
    const text = document.content;

    for (let i = 0; i < text.length; i += this.parentChunkSize) {
      chunks.push({
        content: text.substring(i, i + this.parentChunkSize),
        metadata: { ...document.metadata, chunkType: 'parent' }
      });
    }

    return chunks;
  }

  /**
   * Create child chunks
   */
  createChildChunks(parentText) {
    const chunks = [];
    const step = this.childChunkSize - this.childOverlap;

    for (let i = 0; i < parentText.length; i += step) {
      chunks.push({
        content: parentText.substring(i, i + this.childChunkSize),
        metadata: { chunkType: 'child' }
      });
    }

    return chunks;
  }
}

/**
 * Query Router
 * Routes queries to optimal retrieval strategies
 */
export class QueryRouter {
  constructor(rag) {
    this.rag = rag;
    this.routingRules = new Map();
    this.setupDefaultRules();
  }

  /**
   * Setup default routing rules
   */
  setupDefaultRules() {
    // Simple queries -> semantic retrieval
    this.addRule(
      query => query.split(' ').length <= 5,
      RetrievalStrategy.SEMANTIC
    );

    // Complex analytical queries -> hybrid
    this.addRule(
      query => /analyze|compare|evaluate/.test(query.toLowerCase()),
      RetrievalStrategy.HYBRID
    );

    // Exploratory queries -> HyDE
    this.addRule(
      query => /explore|research|overview/.test(query.toLowerCase()),
      RetrievalStrategy.HYDE
    );

    // Multi-hop queries -> recursive
    this.addRule(
      query => /and|also|furthermore|additionally/.test(query.toLowerCase()),
      RetrievalStrategy.RECURSIVE
    );
  }

  /**
   * Add routing rule
   */
  addRule(condition, strategy) {
    this.routingRules.set(condition, strategy);
  }

  /**
   * Route query
   */
  route(query) {
    for (const [condition, strategy] of this.routingRules) {
      if (condition(query)) {
        return strategy;
      }
    }

    return RetrievalStrategy.HYBRID; // Default
  }
}

/**
 * RAG Performance Monitor
 */
export class RAGMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      queries: [],
      retrievals: [],
      generations: []
    };
  }

  /**
   * Track query
   */
  trackQuery(queryData) {
    this.metrics.queries.push({
      ...queryData,
      timestamp: Date.now()
    });

    this.emit('metrics:updated', this.getAggregatedMetrics());
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics() {
    return {
      totalQueries: this.metrics.queries.length,
      avgRetrievalTime: this.average(
        this.metrics.retrievals.map(r => r.time)
      ),
      avgGenerationTime: this.average(
        this.metrics.generations.map(g => g.time)
      ),
      avgConfidence: this.average(
        this.metrics.queries.map(q => q.confidence)
      ),
      strategyDistribution: this.getStrategyDistribution()
    };
  }

  /**
   * Get strategy distribution
   */
  getStrategyDistribution() {
    const dist = {};
    this.metrics.queries.forEach(q => {
      dist[q.strategy] = (dist[q.strategy] || 0) + 1;
    });
    return dist;
  }

  /**
   * Helper: Average
   */
  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}

/**
 * Export everything
 */
export default {
  AdvancedRAG,
  ParentChildChunker,
  QueryRouter,
  RAGMonitor,
  QueryType,
  RetrievalStrategy
};
