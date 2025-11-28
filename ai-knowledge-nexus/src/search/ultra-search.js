/**
 * Ultra Search Engine - Advanced Search Algorithms
 *
 * Comprehensive search system with neural networks, fuzzy matching,
 * faceted search, temporal/geo-spatial search, and personalization.
 *
 * @module ultra-search
 * @version 2.0.0
 */

const EventEmitter = require('events');

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Damerau-Levenshtein distance (handles transpositions)
 */
function damerauLevenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(Infinity));

  dp[0][0] = 0;
  for (let i = 1; i <= m; i++) dp[i][0] = i;
  for (let j = 1; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 &&
          str1[i - 1] === str2[j - 2] &&
          str1[i - 2] === str2[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }

  return dp[m][n];
}

/**
 * Neural Network for Semantic Search
 */
class SemanticNeuralNetwork {
  constructor(dimensions = 128) {
    this.dimensions = dimensions;
    this.embeddings = new Map();
    this.weights = this.initializeWeights();
  }

  initializeWeights() {
    // Initialize random weights for word embeddings
    const weights = {
      embedding: [],
      attention: [],
      output: []
    };

    // Simple weight initialization (in production, use pre-trained embeddings)
    for (let i = 0; i < 1000; i++) {
      weights.embedding[i] = Array(this.dimensions)
        .fill(0)
        .map(() => (Math.random() - 0.5) * 0.01);
    }

    return weights;
  }

  /**
   * Generate embedding for text using simple bag-of-words + neural transformation
   */
  generateEmbedding(text) {
    const tokens = this.tokenize(text.toLowerCase());
    const embedding = new Array(this.dimensions).fill(0);

    tokens.forEach((token, idx) => {
      const hash = this.hashToken(token);
      const weight = this.weights.embedding[hash % 1000] ||
                     Array(this.dimensions).fill(0.01);

      for (let i = 0; i < this.dimensions; i++) {
        embedding[i] += weight[i] * (1 / (idx + 1)); // Position-weighted
      }
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  hashToken(token) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1, embedding2) {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < this.dimensions; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }

  /**
   * Train on query-document pairs
   */
  train(queryDocPairs, epochs = 10, learningRate = 0.01) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;

      queryDocPairs.forEach(({ query, relevantDoc, irrelevantDoc }) => {
        const queryEmb = this.generateEmbedding(query);
        const relEmb = this.generateEmbedding(relevantDoc);
        const irrelEmb = this.generateEmbedding(irrelevantDoc);

        const relSim = this.cosineSimilarity(queryEmb, relEmb);
        const irrelSim = this.cosineSimilarity(queryEmb, irrelEmb);

        // Triplet loss: want relSim > irrelSim + margin
        const margin = 0.2;
        const loss = Math.max(0, margin - relSim + irrelSim);
        totalLoss += loss;

        // Simple gradient update (in production, use proper backprop)
        if (loss > 0) {
          this.updateWeights(queryEmb, relEmb, irrelEmb, learningRate);
        }
      });

      if (epoch % 10 === 0) {
        console.log(`Epoch ${epoch}, Loss: ${totalLoss / queryDocPairs.length}`);
      }
    }
  }

  updateWeights(queryEmb, relEmb, irrelEmb, lr) {
    // Simplified weight update (placeholder for proper backprop)
    // In production, implement full backpropagation through the network
    for (let i = 0; i < Math.min(100, this.weights.embedding.length); i++) {
      for (let j = 0; j < this.dimensions; j++) {
        const gradient = (irrelEmb[j] - relEmb[j]) * lr;
        this.weights.embedding[i][j] -= gradient * 0.001;
      }
    }
  }
}

/**
 * Query Intent Classifier
 */
class QueryIntentClassifier {
  constructor() {
    this.intents = {
      informational: /^(what|who|where|when|why|how|define|explain)/i,
      navigational: /^(find|show|open|go to|navigate)/i,
      transactional: /^(buy|purchase|download|get|order|book)/i,
      comparative: /^(compare|versus|vs|difference|better)/i,
      local: /\b(near|nearby|local|around|close to)\b/i
    };
  }

  classify(query) {
    const scores = {};
    let maxScore = 0;
    let primaryIntent = 'informational';

    for (const [intent, pattern] of Object.entries(this.intents)) {
      const match = query.match(pattern);
      const score = match ? 1 : 0;
      scores[intent] = score;

      if (score > maxScore) {
        maxScore = score;
        primaryIntent = intent;
      }
    }

    return {
      primary: primaryIntent,
      scores,
      confidence: maxScore
    };
  }
}

/**
 * Ultra Search Engine - Main Class
 */
class UltraSearchEngine extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      fuzzyThreshold: options.fuzzyThreshold || 0.7,
      semanticWeight: options.semanticWeight || 0.4,
      exactMatchBoost: options.exactMatchBoost || 2.0,
      recentBoost: options.recentBoost || 0.3,
      personalizedWeight: options.personalizedWeight || 0.2,
      maxResults: options.maxResults || 100,
      ...options
    };

    // Core components
    this.index = new Map();
    this.documents = new Map();
    this.neuralNetwork = new SemanticNeuralNetwork();
    this.intentClassifier = new QueryIntentClassifier();

    // Search features
    this.facets = new Map();
    this.userProfiles = new Map();
    this.searchAnalytics = {
      queries: [],
      clickthrough: new Map(),
      conversions: new Map()
    };

    // Graph-based search
    this.graph = {
      nodes: new Map(),
      edges: new Map()
    };

    // Geo-spatial index
    this.geoIndex = [];

    // Auto-complete trie
    this.trie = this.buildTrie();

    // Real-time index update queue
    this.updateQueue = [];
    this.indexVersion = 0;
  }

  /**
   * Build trie for auto-complete
   */
  buildTrie() {
    return {
      children: new Map(),
      isEndOfWord: false,
      frequency: 0,
      suggestions: []
    };
  }

  /**
   * Insert term into trie
   */
  insertTrie(term, frequency = 1) {
    let node = this.trie;
    const chars = term.toLowerCase().split('');

    for (const char of chars) {
      if (!node.children.has(char)) {
        node.children.set(char, this.buildTrie());
      }
      node = node.children.get(char);
    }

    node.isEndOfWord = true;
    node.frequency += frequency;
  }

  /**
   * Get auto-complete suggestions
   */
  autoComplete(prefix, maxSuggestions = 10) {
    let node = this.trie;
    const chars = prefix.toLowerCase().split('');

    // Navigate to prefix node
    for (const char of chars) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char);
    }

    // Collect all words from this node
    const suggestions = [];
    this.collectWords(node, prefix, suggestions, maxSuggestions);

    // Sort by frequency
    suggestions.sort((a, b) => b.frequency - a.frequency);

    return suggestions.slice(0, maxSuggestions).map(s => s.word);
  }

  collectWords(node, prefix, suggestions, max) {
    if (suggestions.length >= max) return;

    if (node.isEndOfWord) {
      suggestions.push({ word: prefix, frequency: node.frequency });
    }

    for (const [char, childNode] of node.children) {
      this.collectWords(childNode, prefix + char, suggestions, max);
    }
  }

  /**
   * Index a document
   */
  async indexDocument(doc) {
    const docId = doc.id || this.generateId();

    // Store document
    this.documents.set(docId, {
      ...doc,
      indexedAt: Date.now(),
      version: this.indexVersion
    });

    // Generate neural embedding
    const embedding = this.neuralNetwork.generateEmbedding(
      `${doc.title || ''} ${doc.content || ''} ${doc.description || ''}`
    );

    // Index terms
    const terms = this.extractTerms(doc);
    terms.forEach(term => {
      if (!this.index.has(term)) {
        this.index.set(term, new Set());
      }
      this.index.get(term).add(docId);
      this.insertTrie(term);
    });

    // Index facets
    this.indexFacets(docId, doc);

    // Index geo-spatial data
    if (doc.location) {
      this.geoIndex.push({
        docId,
        lat: doc.location.lat,
        lon: doc.location.lon,
        ...doc.location
      });
    }

    // Index graph relationships
    if (doc.relationships) {
      this.indexGraphRelationships(docId, doc.relationships);
    }

    // Store embedding
    this.neuralNetwork.embeddings.set(docId, embedding);

    // Emit indexing event
    this.emit('documentIndexed', { docId, doc });

    return docId;
  }

  /**
   * Batch index documents
   */
  async indexDocuments(documents) {
    const results = await Promise.all(
      documents.map(doc => this.indexDocument(doc))
    );
    this.indexVersion++;
    return results;
  }

  /**
   * Real-time index update
   */
  async updateIndex(updates) {
    this.updateQueue.push(...updates);

    // Process updates in batch
    if (this.updateQueue.length >= 10) {
      const batch = this.updateQueue.splice(0, 10);
      await Promise.all(batch.map(update => {
        if (update.type === 'add') {
          return this.indexDocument(update.document);
        } else if (update.type === 'update') {
          return this.updateDocument(update.id, update.changes);
        } else if (update.type === 'delete') {
          return this.deleteDocument(update.id);
        }
      }));
    }
  }

  /**
   * Update existing document
   */
  async updateDocument(docId, changes) {
    const doc = this.documents.get(docId);
    if (!doc) return null;

    // Remove old index entries
    await this.deleteDocument(docId);

    // Re-index with changes
    const updated = { ...doc, ...changes, updatedAt: Date.now() };
    return this.indexDocument(updated);
  }

  /**
   * Delete document from index
   */
  async deleteDocument(docId) {
    const doc = this.documents.get(docId);
    if (!doc) return false;

    // Remove from term index
    for (const [term, docIds] of this.index.entries()) {
      docIds.delete(docId);
      if (docIds.size === 0) {
        this.index.delete(term);
      }
    }

    // Remove from other indexes
    this.documents.delete(docId);
    this.neuralNetwork.embeddings.delete(docId);
    this.geoIndex = this.geoIndex.filter(item => item.docId !== docId);

    this.emit('documentDeleted', { docId });
    return true;
  }

  /**
   * Extract searchable terms from document
   */
  extractTerms(doc) {
    const text = [
      doc.title,
      doc.content,
      doc.description,
      doc.tags?.join(' '),
      doc.category
    ].filter(Boolean).join(' ');

    return this.neuralNetwork.tokenize(text);
  }

  /**
   * Index facets for faceted search
   */
  indexFacets(docId, doc) {
    const facetFields = ['category', 'tags', 'author', 'type', 'status'];

    facetFields.forEach(field => {
      if (doc[field]) {
        const values = Array.isArray(doc[field]) ? doc[field] : [doc[field]];
        values.forEach(value => {
          const facetKey = `${field}:${value}`;
          if (!this.facets.has(facetKey)) {
            this.facets.set(facetKey, new Set());
          }
          this.facets.get(facetKey).add(docId);
        });
      }
    });
  }

  /**
   * Index graph relationships
   */
  indexGraphRelationships(docId, relationships) {
    if (!this.graph.nodes.has(docId)) {
      this.graph.nodes.set(docId, { edges: [] });
    }

    relationships.forEach(rel => {
      const edge = {
        from: docId,
        to: rel.targetId,
        type: rel.type,
        weight: rel.weight || 1
      };

      const edgeId = `${docId}-${rel.targetId}`;
      this.graph.edges.set(edgeId, edge);
      this.graph.nodes.get(docId).edges.push(edgeId);
    });
  }

  /**
   * Main search function
   */
  async search(query, options = {}) {
    const startTime = Date.now();

    // Parse search options
    const searchOptions = {
      fields: options.fields || ['title', 'content', 'description'],
      fuzzy: options.fuzzy !== false,
      semantic: options.semantic !== false,
      facets: options.facets || [],
      filters: options.filters || {},
      temporal: options.temporal || null,
      geoLocation: options.geoLocation || null,
      geoRadius: options.geoRadius || 10, // km
      userId: options.userId || null,
      limit: options.limit || this.options.maxResults,
      offset: options.offset || 0,
      diversify: options.diversify !== false,
      ...options
    };

    // Classify query intent
    const intent = this.intentClassifier.classify(query);

    // Generate query embedding
    const queryEmbedding = this.neuralNetwork.generateEmbedding(query);

    // Multi-stage search
    let results = [];

    // 1. Exact match search
    const exactResults = this.exactMatchSearch(query, searchOptions);

    // 2. Fuzzy match search
    const fuzzyResults = searchOptions.fuzzy
      ? this.fuzzyMatchSearch(query, searchOptions)
      : [];

    // 3. Semantic search
    const semanticResults = searchOptions.semantic
      ? this.semanticSearch(queryEmbedding, searchOptions)
      : [];

    // 4. Multi-field search
    const multiFieldResults = this.multiFieldSearch(query, searchOptions);

    // Combine results with scoring
    const combinedResults = this.combineResults([
      { results: exactResults, weight: 1.0, type: 'exact' },
      { results: fuzzyResults, weight: 0.6, type: 'fuzzy' },
      { results: semanticResults, weight: this.options.semanticWeight, type: 'semantic' },
      { results: multiFieldResults, weight: 0.8, type: 'multifield' }
    ]);

    // Apply filters
    results = this.applyFilters(combinedResults, searchOptions.filters);

    // Apply facet filtering
    if (searchOptions.facets.length > 0) {
      results = this.applyFacetFilters(results, searchOptions.facets);
    }

    // Apply temporal filtering
    if (searchOptions.temporal) {
      results = this.temporalFilter(results, searchOptions.temporal);
    }

    // Apply geo-spatial filtering
    if (searchOptions.geoLocation) {
      results = this.geoSpatialFilter(
        results,
        searchOptions.geoLocation,
        searchOptions.geoRadius
      );
    }

    // Apply graph-based relevance
    results = this.enhanceWithGraphRelevance(results, query);

    // Apply personalization
    if (searchOptions.userId) {
      results = this.personalizeResults(results, searchOptions.userId);
    }

    // Apply collaborative filtering
    results = this.collaborativeFilter(results, searchOptions.userId);

    // Diversify results
    if (searchOptions.diversify) {
      results = this.diversifyResults(results);
    }

    // Sort by final score
    results.sort((a, b) => b.score - a.score);

    // Pagination
    const paginatedResults = results.slice(
      searchOptions.offset,
      searchOptions.offset + searchOptions.limit
    );

    // Compute facets for results
    const facetCounts = this.computeFacets(results);

    // Record analytics
    this.recordSearch(query, paginatedResults.length, intent);

    const searchTime = Date.now() - startTime;

    // Emit search event
    this.emit('searchPerformed', {
      query,
      intent,
      resultCount: paginatedResults.length,
      searchTime
    });

    return {
      query,
      intent,
      results: paginatedResults,
      total: results.length,
      facets: facetCounts,
      searchTime,
      offset: searchOptions.offset,
      limit: searchOptions.limit
    };
  }

  /**
   * Exact match search
   */
  exactMatchSearch(query, options) {
    const terms = this.neuralNetwork.tokenize(query);
    const results = new Map();

    terms.forEach(term => {
      if (this.index.has(term)) {
        this.index.get(term).forEach(docId => {
          const doc = this.documents.get(docId);
          if (!doc) return;

          const score = this.calculateExactMatchScore(doc, terms, options.fields);
          results.set(docId, {
            docId,
            doc,
            score: score * this.options.exactMatchBoost,
            matchType: 'exact'
          });
        });
      }
    });

    return Array.from(results.values());
  }

  /**
   * Fuzzy match search with typo tolerance
   */
  fuzzyMatchSearch(query, options) {
    const queryTerms = this.neuralNetwork.tokenize(query);
    const results = new Map();

    queryTerms.forEach(queryTerm => {
      for (const [indexTerm, docIds] of this.index.entries()) {
        const distance = damerauLevenshteinDistance(queryTerm, indexTerm);
        const maxLen = Math.max(queryTerm.length, indexTerm.length);
        const similarity = 1 - (distance / maxLen);

        if (similarity >= this.options.fuzzyThreshold) {
          docIds.forEach(docId => {
            const doc = this.documents.get(docId);
            if (!doc) return;

            const currentScore = results.get(docId)?.score || 0;
            results.set(docId, {
              docId,
              doc,
              score: currentScore + similarity,
              matchType: 'fuzzy'
            });
          });
        }
      }
    });

    return Array.from(results.values());
  }

  /**
   * Semantic search using neural embeddings
   */
  semanticSearch(queryEmbedding, options) {
    const results = [];

    for (const [docId, docEmbedding] of this.neuralNetwork.embeddings.entries()) {
      const similarity = this.neuralNetwork.cosineSimilarity(
        queryEmbedding,
        docEmbedding
      );

      if (similarity > 0.1) { // Minimum threshold
        const doc = this.documents.get(docId);
        if (doc) {
          results.push({
            docId,
            doc,
            score: similarity,
            matchType: 'semantic'
          });
        }
      }
    }

    return results;
  }

  /**
   * Multi-field search
   */
  multiFieldSearch(query, options) {
    const terms = this.neuralNetwork.tokenize(query);
    const results = new Map();

    for (const [docId, doc] of this.documents.entries()) {
      let score = 0;

      options.fields.forEach(field => {
        if (doc[field]) {
          const fieldText = String(doc[field]).toLowerCase();
          terms.forEach(term => {
            if (fieldText.includes(term)) {
              // Field-specific boosting
              const fieldBoost = field === 'title' ? 2.0 :
                                field === 'description' ? 1.5 : 1.0;
              score += fieldBoost;
            }
          });
        }
      });

      if (score > 0) {
        results.set(docId, {
          docId,
          doc,
          score,
          matchType: 'multifield'
        });
      }
    }

    return Array.from(results.values());
  }

  /**
   * Calculate exact match score
   */
  calculateExactMatchScore(doc, terms, fields) {
    let score = 0;

    fields.forEach(field => {
      if (doc[field]) {
        const fieldText = String(doc[field]).toLowerCase();
        const fieldTerms = this.neuralNetwork.tokenize(fieldText);

        terms.forEach(term => {
          const count = fieldTerms.filter(t => t === term).length;
          score += count * (field === 'title' ? 2.0 : 1.0);
        });

        // Phrase matching bonus
        const queryPhrase = terms.join(' ');
        if (fieldText.includes(queryPhrase)) {
          score += terms.length * 2;
        }
      }
    });

    return score;
  }

  /**
   * Combine results from multiple search strategies
   */
  combineResults(resultSets) {
    const combined = new Map();

    resultSets.forEach(({ results, weight, type }) => {
      results.forEach(result => {
        const existing = combined.get(result.docId);
        const weightedScore = result.score * weight;

        if (existing) {
          existing.score += weightedScore;
          existing.matchTypes.push(type);
        } else {
          combined.set(result.docId, {
            ...result,
            score: weightedScore,
            matchTypes: [type]
          });
        }
      });
    });

    return Array.from(combined.values());
  }

  /**
   * Apply general filters
   */
  applyFilters(results, filters) {
    return results.filter(result => {
      const doc = result.doc;

      return Object.entries(filters).every(([field, value]) => {
        if (Array.isArray(value)) {
          return value.includes(doc[field]);
        }
        return doc[field] === value;
      });
    });
  }

  /**
   * Apply facet filters
   */
  applyFacetFilters(results, facets) {
    const facetDocIds = new Set();

    facets.forEach(facet => {
      const facetKey = `${facet.field}:${facet.value}`;
      if (this.facets.has(facetKey)) {
        this.facets.get(facetKey).forEach(docId => facetDocIds.add(docId));
      }
    });

    return results.filter(result => facetDocIds.has(result.docId));
  }

  /**
   * Temporal filtering (time-aware search)
   */
  temporalFilter(results, temporal) {
    const now = Date.now();

    return results.map(result => {
      const doc = result.doc;
      const docTime = doc.publishedAt || doc.createdAt || doc.indexedAt;

      if (!docTime) return result;

      // Calculate time decay
      const ageMs = now - docTime;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      let temporalBoost = 1.0;

      if (temporal.mode === 'recent') {
        // Boost recent documents
        temporalBoost = Math.exp(-ageDays / temporal.halfLife || 30);
      } else if (temporal.mode === 'range') {
        // Filter by date range
        if (docTime >= temporal.start && docTime <= temporal.end) {
          temporalBoost = 1.5;
        } else {
          temporalBoost = 0.1;
        }
      }

      return {
        ...result,
        score: result.score * (1 + this.options.recentBoost * temporalBoost)
      };
    });
  }

  /**
   * Geo-spatial filtering
   */
  geoSpatialFilter(results, location, radiusKm) {
    return results.map(result => {
      const doc = result.doc;

      if (!doc.location) return result;

      const distance = this.haversineDistance(
        location.lat,
        location.lon,
        doc.location.lat,
        doc.location.lon
      );

      if (distance <= radiusKm) {
        // Boost by proximity
        const proximityBoost = 1 - (distance / radiusKm);
        return {
          ...result,
          score: result.score * (1 + proximityBoost),
          distance
        };
      }

      return { ...result, score: result.score * 0.1, distance };
    });
  }

  /**
   * Haversine distance calculation
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Enhance results with graph-based relevance
   */
  enhanceWithGraphRelevance(results, query) {
    return results.map(result => {
      const docId = result.docId;
      const node = this.graph.nodes.get(docId);

      if (!node) return result;

      // Calculate PageRank-like score
      let graphScore = 0;
      node.edges.forEach(edgeId => {
        const edge = this.graph.edges.get(edgeId);
        if (edge) {
          graphScore += edge.weight;
        }
      });

      return {
        ...result,
        score: result.score * (1 + 0.1 * Math.log(1 + graphScore))
      };
    });
  }

  /**
   * Personalize results based on user profile
   */
  personalizeResults(results, userId) {
    const profile = this.userProfiles.get(userId);

    if (!profile) return results;

    return results.map(result => {
      const doc = result.doc;
      let personalBoost = 0;

      // Boost by user preferences
      if (profile.interests) {
        profile.interests.forEach(interest => {
          if (doc.category === interest || doc.tags?.includes(interest)) {
            personalBoost += 0.2;
          }
        });
      }

      // Boost by interaction history
      if (profile.viewedDocs?.includes(doc.id)) {
        personalBoost -= 0.1; // Slight penalty for already viewed
      }

      // Boost by user's search history
      if (profile.searchHistory) {
        const similarityToHistory = this.calculateHistorySimilarity(
          doc,
          profile.searchHistory
        );
        personalBoost += similarityToHistory * 0.15;
      }

      return {
        ...result,
        score: result.score * (1 + this.options.personalizedWeight * personalBoost)
      };
    });
  }

  /**
   * Calculate similarity to user's search history
   */
  calculateHistorySimilarity(doc, searchHistory) {
    let similarity = 0;
    const recent = searchHistory.slice(-10);

    recent.forEach(search => {
      const queryTerms = this.neuralNetwork.tokenize(search.query);
      const docText = `${doc.title} ${doc.content} ${doc.description}`.toLowerCase();

      queryTerms.forEach(term => {
        if (docText.includes(term)) {
          similarity += 0.1;
        }
      });
    });

    return Math.min(similarity, 1.0);
  }

  /**
   * Collaborative filtering
   */
  collaborativeFilter(results, userId) {
    if (!userId) return results;

    const profile = this.userProfiles.get(userId);
    if (!profile) return results;

    // Find similar users
    const similarUsers = this.findSimilarUsers(userId);

    return results.map(result => {
      let collaborativeScore = 0;

      similarUsers.forEach(({ userId: similarUserId, similarity }) => {
        const similarProfile = this.userProfiles.get(similarUserId);
        if (similarProfile?.likedDocs?.includes(result.docId)) {
          collaborativeScore += similarity;
        }
      });

      return {
        ...result,
        score: result.score * (1 + 0.1 * collaborativeScore)
      };
    });
  }

  /**
   * Find similar users for collaborative filtering
   */
  findSimilarUsers(userId, limit = 5) {
    const profile = this.userProfiles.get(userId);
    if (!profile) return [];

    const similarities = [];

    for (const [otherUserId, otherProfile] of this.userProfiles.entries()) {
      if (otherUserId === userId) continue;

      const similarity = this.calculateUserSimilarity(profile, otherProfile);
      similarities.push({ userId: otherUserId, similarity });
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Calculate similarity between two user profiles
   */
  calculateUserSimilarity(profile1, profile2) {
    let similarity = 0;

    // Interest overlap
    if (profile1.interests && profile2.interests) {
      const intersection = profile1.interests.filter(i =>
        profile2.interests.includes(i)
      );
      similarity += intersection.length / Math.max(
        profile1.interests.length,
        profile2.interests.length
      );
    }

    // Viewed documents overlap
    if (profile1.viewedDocs && profile2.viewedDocs) {
      const intersection = profile1.viewedDocs.filter(d =>
        profile2.viewedDocs.includes(d)
      );
      similarity += intersection.length / Math.max(
        profile1.viewedDocs.length,
        profile2.viewedDocs.length
      ) * 0.5;
    }

    return similarity;
  }

  /**
   * Diversify search results to reduce redundancy
   */
  diversifyResults(results, diversityWeight = 0.5) {
    if (results.length <= 1) return results;

    const diversified = [results[0]];
    const remaining = results.slice(1);

    while (remaining.length > 0 && diversified.length < results.length) {
      let maxDiversity = -1;
      let maxIndex = 0;

      remaining.forEach((candidate, idx) => {
        // Calculate average diversity from already selected results
        let diversity = 0;
        diversified.forEach(selected => {
          diversity += this.calculateDiversity(candidate, selected);
        });
        diversity /= diversified.length;

        // Balance relevance and diversity
        const score = candidate.score * (1 - diversityWeight) +
                     diversity * diversityWeight;

        if (score > maxDiversity) {
          maxDiversity = score;
          maxIndex = idx;
        }
      });

      diversified.push(remaining[maxIndex]);
      remaining.splice(maxIndex, 1);
    }

    return diversified;
  }

  /**
   * Calculate diversity between two results
   */
  calculateDiversity(result1, result2) {
    const doc1 = result1.doc;
    const doc2 = result2.doc;

    let diversity = 0;

    // Category diversity
    if (doc1.category !== doc2.category) {
      diversity += 0.3;
    }

    // Author diversity
    if (doc1.author !== doc2.author) {
      diversity += 0.2;
    }

    // Content diversity (using embeddings)
    const emb1 = this.neuralNetwork.embeddings.get(result1.docId);
    const emb2 = this.neuralNetwork.embeddings.get(result2.docId);

    if (emb1 && emb2) {
      const similarity = this.neuralNetwork.cosineSimilarity(emb1, emb2);
      diversity += (1 - similarity) * 0.5;
    }

    return diversity;
  }

  /**
   * Compute facet counts for results
   */
  computeFacets(results) {
    const facetCounts = {
      category: {},
      tags: {},
      author: {},
      type: {},
      status: {}
    };

    results.forEach(result => {
      const doc = result.doc;

      Object.keys(facetCounts).forEach(facetField => {
        if (doc[facetField]) {
          const values = Array.isArray(doc[facetField])
            ? doc[facetField]
            : [doc[facetField]];

          values.forEach(value => {
            facetCounts[facetField][value] =
              (facetCounts[facetField][value] || 0) + 1;
          });
        }
      });
    });

    return facetCounts;
  }

  /**
   * Record search analytics
   */
  recordSearch(query, resultCount, intent) {
    this.searchAnalytics.queries.push({
      query,
      resultCount,
      intent,
      timestamp: Date.now()
    });

    // Keep last 10000 queries
    if (this.searchAnalytics.queries.length > 10000) {
      this.searchAnalytics.queries = this.searchAnalytics.queries.slice(-10000);
    }
  }

  /**
   * Record click-through for analytics
   */
  recordClickThrough(query, docId, position) {
    const key = `${query}:${docId}`;
    if (!this.searchAnalytics.clickthrough.has(key)) {
      this.searchAnalytics.clickthrough.set(key, []);
    }
    this.searchAnalytics.clickthrough.get(key).push({
      position,
      timestamp: Date.now()
    });
  }

  /**
   * Get search analytics insights
   */
  getSearchAnalytics(options = {}) {
    const timeRange = options.timeRange || 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    const recentQueries = this.searchAnalytics.queries.filter(
      q => now - q.timestamp <= timeRange
    );

    // Top queries
    const queryFreq = {};
    recentQueries.forEach(q => {
      queryFreq[q.query] = (queryFreq[q.query] || 0) + 1;
    });

    const topQueries = Object.entries(queryFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Zero result queries
    const zeroResultQueries = recentQueries
      .filter(q => q.resultCount === 0)
      .map(q => q.query);

    // Intent distribution
    const intentDist = {};
    recentQueries.forEach(q => {
      const intent = q.intent.primary;
      intentDist[intent] = (intentDist[intent] || 0) + 1;
    });

    // Click-through rate
    const ctr = this.calculateClickThroughRate(timeRange);

    return {
      totalQueries: recentQueries.length,
      topQueries,
      zeroResultQueries: [...new Set(zeroResultQueries)],
      intentDistribution: intentDist,
      clickThroughRate: ctr,
      avgResultCount: recentQueries.reduce((sum, q) => sum + q.resultCount, 0) /
                     recentQueries.length
    };
  }

  /**
   * Calculate click-through rate
   */
  calculateClickThroughRate(timeRange) {
    const now = Date.now();
    let totalSearches = 0;
    let totalClicks = 0;

    for (const [key, clicks] of this.searchAnalytics.clickthrough.entries()) {
      const recentClicks = clicks.filter(c => now - c.timestamp <= timeRange);
      if (recentClicks.length > 0) {
        totalSearches++;
        totalClicks += recentClicks.length;
      }
    }

    return totalSearches > 0 ? totalClicks / totalSearches : 0;
  }

  /**
   * Federated search across multiple sources
   */
  async federatedSearch(query, sources, options = {}) {
    const results = await Promise.all(
      sources.map(async source => {
        try {
          if (source.type === 'internal') {
            return await this.search(query, { ...options, ...source.options });
          } else if (source.type === 'external' && source.searchFn) {
            const externalResults = await source.searchFn(query, options);
            return {
              source: source.name,
              results: externalResults,
              type: 'external'
            };
          }
        } catch (error) {
          console.error(`Error searching source ${source.name}:`, error);
          return { source: source.name, results: [], error: error.message };
        }
      })
    );

    // Merge and rank results from all sources
    const mergedResults = this.mergeSearchResults(results, options);

    return {
      query,
      sources: results.map(r => ({
        name: r.source,
        resultCount: r.results?.length || 0,
        error: r.error
      })),
      results: mergedResults,
      total: mergedResults.length
    };
  }

  /**
   * Merge results from federated search
   */
  mergeSearchResults(sourceResults, options) {
    const merged = new Map();

    sourceResults.forEach((sourceResult, sourceIndex) => {
      if (!sourceResult.results) return;

      const results = Array.isArray(sourceResult.results)
        ? sourceResult.results
        : sourceResult.results.results || [];

      results.forEach((result, position) => {
        const key = result.docId || result.id || `${sourceIndex}-${position}`;

        if (merged.has(key)) {
          // Document appears in multiple sources - boost score
          const existing = merged.get(key);
          existing.score += result.score * 0.5;
          existing.sources.push(sourceResult.source || `source-${sourceIndex}`);
        } else {
          merged.set(key, {
            ...result,
            sources: [sourceResult.source || `source-${sourceIndex}`],
            sourceScore: result.score
          });
        }
      });
    });

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || this.options.maxResults);
  }

  /**
   * Update user profile for personalization
   */
  updateUserProfile(userId, updates) {
    const profile = this.userProfiles.get(userId) || {
      interests: [],
      viewedDocs: [],
      likedDocs: [],
      searchHistory: []
    };

    Object.assign(profile, updates);
    this.userProfiles.set(userId, profile);

    return profile;
  }

  /**
   * Train neural network on user interactions
   */
  async trainOnInteractions(interactions, options = {}) {
    const trainingPairs = interactions.map(interaction => ({
      query: interaction.query,
      relevantDoc: interaction.clickedDoc?.content || '',
      irrelevantDoc: interaction.skippedDoc?.content || ''
    }));

    await this.neuralNetwork.train(
      trainingPairs,
      options.epochs || 10,
      options.learningRate || 0.01
    );

    this.emit('neuralNetworkTrained', {
      interactions: interactions.length,
      epochs: options.epochs || 10
    });
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export search index
   */
  exportIndex() {
    return {
      version: this.indexVersion,
      documents: Array.from(this.documents.entries()),
      index: Array.from(this.index.entries()).map(([term, docIds]) => [
        term,
        Array.from(docIds)
      ]),
      facets: Array.from(this.facets.entries()).map(([key, docIds]) => [
        key,
        Array.from(docIds)
      ]),
      geoIndex: this.geoIndex,
      graph: {
        nodes: Array.from(this.graph.nodes.entries()),
        edges: Array.from(this.graph.edges.entries())
      }
    };
  }

  /**
   * Import search index
   */
  importIndex(data) {
    this.indexVersion = data.version;
    this.documents = new Map(data.documents);
    this.index = new Map(
      data.index.map(([term, docIds]) => [term, new Set(docIds)])
    );
    this.facets = new Map(
      data.facets.map(([key, docIds]) => [key, new Set(docIds)])
    );
    this.geoIndex = data.geoIndex;
    this.graph = {
      nodes: new Map(data.graph.nodes),
      edges: new Map(data.graph.edges)
    };

    // Rebuild embeddings
    this.documents.forEach((doc, docId) => {
      const embedding = this.neuralNetwork.generateEmbedding(
        `${doc.title || ''} ${doc.content || ''} ${doc.description || ''}`
      );
      this.neuralNetwork.embeddings.set(docId, embedding);
    });

    this.emit('indexImported', { documentCount: this.documents.size });
  }

  /**
   * Get search engine stats
   */
  getStats() {
    return {
      documents: this.documents.size,
      terms: this.index.size,
      facets: this.facets.size,
      geoIndexedDocs: this.geoIndex.length,
      graphNodes: this.graph.nodes.size,
      graphEdges: this.graph.edges.size,
      userProfiles: this.userProfiles.size,
      indexVersion: this.indexVersion,
      embeddings: this.neuralNetwork.embeddings.size
    };
  }
}

// Export
module.exports = {
  UltraSearchEngine,
  SemanticNeuralNetwork,
  QueryIntentClassifier,
  levenshteinDistance,
  damerauLevenshteinDistance
};
