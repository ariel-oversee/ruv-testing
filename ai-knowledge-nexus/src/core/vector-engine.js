/**
 * Advanced Vector Engine for AI Knowledge Nexus
 *
 * Features:
 * - Hybrid search (dense + sparse vectors)
 * - Multi-vector storage and retrieval
 * - Configurable similarity metrics (cosine, euclidean, dot product)
 * - Batch embedding operations
 * - Vector compression and quantization
 * - Advanced filtering and metadata search
 * - Real-time index updates
 * - Vector space transformations
 * - Approximate nearest neighbor (ANN) search
 * - Product quantization for compression
 * - HNSW graph approximation
 * - Dynamic index rebalancing
 */

const crypto = require('crypto');

/**
 * Vector similarity metrics
 */
class SimilarityMetrics {
  /**
   * Cosine similarity between two vectors
   * @param {number[]} a - First vector
   * @param {number[]} b - Second vector
   * @returns {number} Similarity score [-1, 1]
   */
  static cosine(a, b) {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Euclidean distance between two vectors
   * @param {number[]} a - First vector
   * @param {number[]} b - Second vector
   * @returns {number} Distance (lower is more similar)
   */
  static euclidean(a, b) {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Dot product similarity
   * @param {number[]} a - First vector
   * @param {number[]} b - Second vector
   * @returns {number} Dot product
   */
  static dotProduct(a, b) {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }

    return sum;
  }

  /**
   * Manhattan distance
   * @param {number[]} a - First vector
   * @param {number[]} b - Second vector
   * @returns {number} Distance
   */
  static manhattan(a, b) {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }

    return sum;
  }
}

/**
 * Product Quantization for vector compression
 */
class ProductQuantizer {
  constructor(dimensions, numSubvectors = 8, numCentroids = 256) {
    this.dimensions = dimensions;
    this.numSubvectors = numSubvectors;
    this.numCentroids = numCentroids;
    this.subvectorSize = Math.ceil(dimensions / numSubvectors);
    this.codebooks = [];
    this.trained = false;
  }

  /**
   * Train quantizer on sample vectors
   * @param {number[][]} vectors - Training vectors
   */
  train(vectors) {
    if (vectors.length === 0) {
      throw new Error('Cannot train on empty vector set');
    }

    // Initialize codebooks for each subvector
    for (let i = 0; i < this.numSubvectors; i++) {
      const start = i * this.subvectorSize;
      const end = Math.min(start + this.subvectorSize, this.dimensions);

      // Extract subvectors
      const subvectors = vectors.map(v => v.slice(start, end));

      // Simple k-means clustering for codebook generation
      const codebook = this._kmeans(subvectors, this.numCentroids);
      this.codebooks.push(codebook);
    }

    this.trained = true;
  }

  /**
   * Compress vector using product quantization
   * @param {number[]} vector - Input vector
   * @returns {Uint8Array} Compressed representation
   */
  compress(vector) {
    if (!this.trained) {
      throw new Error('Quantizer must be trained before compression');
    }

    const codes = new Uint8Array(this.numSubvectors);

    for (let i = 0; i < this.numSubvectors; i++) {
      const start = i * this.subvectorSize;
      const end = Math.min(start + this.subvectorSize, this.dimensions);
      const subvector = vector.slice(start, end);

      // Find nearest centroid
      let minDist = Infinity;
      let minIdx = 0;

      for (let j = 0; j < this.codebooks[i].length; j++) {
        const dist = SimilarityMetrics.euclidean(subvector, this.codebooks[i][j]);
        if (dist < minDist) {
          minDist = dist;
          minIdx = j;
        }
      }

      codes[i] = minIdx;
    }

    return codes;
  }

  /**
   * Decompress vector from quantized representation
   * @param {Uint8Array} codes - Compressed codes
   * @returns {number[]} Decompressed vector
   */
  decompress(codes) {
    if (!this.trained) {
      throw new Error('Quantizer must be trained before decompression');
    }

    const vector = [];

    for (let i = 0; i < this.numSubvectors; i++) {
      const centroid = this.codebooks[i][codes[i]];
      vector.push(...centroid);
    }

    return vector.slice(0, this.dimensions);
  }

  /**
   * Simple k-means clustering
   * @private
   */
  _kmeans(vectors, k, maxIterations = 100) {
    if (vectors.length === 0) return [];

    // Initialize centroids randomly
    const centroids = [];
    const indices = new Set();
    while (centroids.length < Math.min(k, vectors.length)) {
      const idx = Math.floor(Math.random() * vectors.length);
      if (!indices.has(idx)) {
        centroids.push([...vectors[idx]]);
        indices.add(idx);
      }
    }

    let assignments = new Array(vectors.length).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;

      // Assign vectors to nearest centroid
      for (let i = 0; i < vectors.length; i++) {
        let minDist = Infinity;
        let minIdx = 0;

        for (let j = 0; j < centroids.length; j++) {
          const dist = SimilarityMetrics.euclidean(vectors[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            minIdx = j;
          }
        }

        if (assignments[i] !== minIdx) {
          assignments[i] = minIdx;
          changed = true;
        }
      }

      if (!changed) break;

      // Update centroids
      for (let j = 0; j < centroids.length; j++) {
        const cluster = vectors.filter((_, i) => assignments[i] === j);
        if (cluster.length > 0) {
          const newCentroid = new Array(cluster[0].length).fill(0);
          for (const vec of cluster) {
            for (let k = 0; k < vec.length; k++) {
              newCentroid[k] += vec[k];
            }
          }
          for (let k = 0; k < newCentroid.length; k++) {
            newCentroid[k] /= cluster.length;
          }
          centroids[j] = newCentroid;
        }
      }
    }

    return centroids;
  }
}

/**
 * HNSW (Hierarchical Navigable Small World) Graph Node
 */
class HNSWNode {
  constructor(id, vector, level, metadata = {}) {
    this.id = id;
    this.vector = vector;
    this.level = level;
    this.metadata = metadata;
    this.connections = new Array(level + 1).fill(null).map(() => []);
  }

  addConnection(targetId, level) {
    if (level <= this.level && !this.connections[level].includes(targetId)) {
      this.connections[level].push(targetId);
    }
  }

  getConnections(level) {
    return level <= this.level ? this.connections[level] : [];
  }
}

/**
 * HNSW Index for approximate nearest neighbor search
 */
class HNSWIndex {
  constructor(dimensions, M = 16, efConstruction = 200, ml = 1.0 / Math.log(2.0)) {
    this.dimensions = dimensions;
    this.M = M; // Max connections per layer
    this.Mmax = M;
    this.Mmax0 = M * 2;
    this.efConstruction = efConstruction;
    this.ml = ml;
    this.nodes = new Map();
    this.entryPoint = null;
    this.metricFunc = SimilarityMetrics.cosine;
  }

  /**
   * Set similarity metric
   * @param {string} metric - 'cosine', 'euclidean', or 'dotProduct'
   */
  setMetric(metric) {
    const metrics = {
      cosine: SimilarityMetrics.cosine,
      euclidean: (a, b) => -SimilarityMetrics.euclidean(a, b),
      dotProduct: SimilarityMetrics.dotProduct,
      manhattan: (a, b) => -SimilarityMetrics.manhattan(a, b)
    };

    if (!metrics[metric]) {
      throw new Error(`Unknown metric: ${metric}`);
    }

    this.metricFunc = metrics[metric];
  }

  /**
   * Generate random level using exponential decay
   * @private
   */
  _getRandomLevel() {
    let level = 0;
    while (Math.random() < this.ml && level < 16) {
      level++;
    }
    return level;
  }

  /**
   * Insert vector into HNSW index
   * @param {string} id - Vector ID
   * @param {number[]} vector - Vector to insert
   * @param {Object} metadata - Associated metadata
   */
  insert(id, vector, metadata = {}) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`);
    }

    const level = this._getRandomLevel();
    const node = new HNSWNode(id, vector, level, metadata);

    if (this.entryPoint === null) {
      this.entryPoint = id;
      this.nodes.set(id, node);
      return;
    }

    // Search for nearest neighbors at each level
    const entryNode = this.nodes.get(this.entryPoint);
    let currNeighbors = [this.entryPoint];

    // Search from top to target level
    for (let lc = entryNode.level; lc > level; lc--) {
      currNeighbors = this._searchLayer(vector, currNeighbors, 1, lc);
    }

    // Insert at all levels from level to 0
    for (let lc = level; lc >= 0; lc--) {
      const candidates = this._searchLayer(vector, currNeighbors, this.efConstruction, lc);
      const M = lc === 0 ? this.Mmax0 : this.Mmax;

      // Select M neighbors
      const neighbors = this._selectNeighbors(vector, candidates, M);

      // Add bidirectional connections
      for (const neighborId of neighbors) {
        node.addConnection(neighborId, lc);
        const neighborNode = this.nodes.get(neighborId);
        if (neighborNode) {
          neighborNode.addConnection(id, lc);

          // Prune connections if needed
          const maxConn = lc === 0 ? this.Mmax0 : this.Mmax;
          if (neighborNode.getConnections(lc).length > maxConn) {
            const pruned = this._selectNeighbors(
              neighborNode.vector,
              neighborNode.getConnections(lc),
              maxConn
            );
            neighborNode.connections[lc] = pruned;
          }
        }
      }

      currNeighbors = neighbors;
    }

    this.nodes.set(id, node);

    // Update entry point if new node is higher
    if (level > this.nodes.get(this.entryPoint).level) {
      this.entryPoint = id;
    }
  }

  /**
   * Search layer for nearest neighbors
   * @private
   */
  _searchLayer(query, entryPoints, ef, level) {
    const visited = new Set(entryPoints);
    const candidates = entryPoints.map(id => ({
      id,
      dist: this.metricFunc(query, this.nodes.get(id).vector)
    }));
    const nearest = [...candidates];

    candidates.sort((a, b) => b.dist - a.dist);
    nearest.sort((a, b) => b.dist - a.dist);

    while (candidates.length > 0) {
      const current = candidates.pop();

      if (nearest.length >= ef && current.dist < nearest[0].dist) {
        break;
      }

      const currentNode = this.nodes.get(current.id);
      if (!currentNode) continue;

      for (const neighborId of currentNode.getConnections(level)) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;

        const dist = this.metricFunc(query, neighborNode.vector);

        if (nearest.length < ef || dist > nearest[0].dist) {
          candidates.push({ id: neighborId, dist });
          nearest.push({ id: neighborId, dist });

          candidates.sort((a, b) => b.dist - a.dist);
          nearest.sort((a, b) => b.dist - a.dist);

          if (nearest.length > ef) {
            nearest.shift();
          }
        }
      }
    }

    return nearest.map(n => n.id);
  }

  /**
   * Select neighbors using heuristic
   * @private
   */
  _selectNeighbors(vector, candidates, M) {
    if (candidates.length <= M) {
      return candidates;
    }

    const withDist = candidates.map(id => ({
      id,
      dist: this.metricFunc(vector, this.nodes.get(id).vector)
    }));

    withDist.sort((a, b) => b.dist - a.dist);
    return withDist.slice(0, M).map(n => n.id);
  }

  /**
   * Search for k nearest neighbors
   * @param {number[]} query - Query vector
   * @param {number} k - Number of results
   * @param {number} ef - Search width (higher = more accurate)
   * @returns {Array} Nearest neighbors with scores
   */
  search(query, k = 10, ef = 50) {
    if (this.entryPoint === null) {
      return [];
    }

    if (query.length !== this.dimensions) {
      throw new Error(`Query dimension mismatch: expected ${this.dimensions}, got ${query.length}`);
    }

    const entryNode = this.nodes.get(this.entryPoint);
    let currNeighbors = [this.entryPoint];

    // Search from top to level 0
    for (let lc = entryNode.level; lc > 0; lc--) {
      currNeighbors = this._searchLayer(query, currNeighbors, 1, lc);
    }

    // Final search at level 0
    const results = this._searchLayer(query, currNeighbors, Math.max(ef, k), 0);

    // Calculate final similarities and return top k
    return results
      .map(id => {
        const node = this.nodes.get(id);
        return {
          id,
          score: this.metricFunc(query, node.vector),
          vector: node.vector,
          metadata: node.metadata
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /**
   * Remove vector from index
   * @param {string} id - Vector ID to remove
   */
  remove(id) {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove all connections to this node
    for (const [nodeId, otherNode] of this.nodes.entries()) {
      if (nodeId === id) continue;

      for (let level = 0; level <= otherNode.level; level++) {
        otherNode.connections[level] = otherNode.connections[level].filter(
          connId => connId !== id
        );
      }
    }

    this.nodes.delete(id);

    // Update entry point if needed
    if (this.entryPoint === id) {
      this.entryPoint = this.nodes.size > 0 ? this.nodes.keys().next().value : null;
    }

    return true;
  }

  /**
   * Get index statistics
   */
  getStats() {
    const levels = {};
    let totalConnections = 0;

    for (const node of this.nodes.values()) {
      levels[node.level] = (levels[node.level] || 0) + 1;
      for (let l = 0; l <= node.level; l++) {
        totalConnections += node.connections[l].length;
      }
    }

    return {
      totalNodes: this.nodes.size,
      levels,
      avgConnections: this.nodes.size > 0 ? totalConnections / this.nodes.size : 0,
      entryLevel: this.entryPoint ? this.nodes.get(this.entryPoint).level : 0
    };
  }
}

/**
 * Sparse vector representation for hybrid search
 */
class SparseVector {
  constructor(indices, values, dimensions) {
    this.indices = indices;
    this.values = values;
    this.dimensions = dimensions;
  }

  /**
   * Convert to dense vector
   */
  toDense() {
    const dense = new Array(this.dimensions).fill(0);
    for (let i = 0; i < this.indices.length; i++) {
      dense[this.indices[i]] = this.values[i];
    }
    return dense;
  }

  /**
   * Sparse dot product
   */
  dotProduct(other) {
    let sum = 0;
    const otherMap = new Map();

    for (let i = 0; i < other.indices.length; i++) {
      otherMap.set(other.indices[i], other.values[i]);
    }

    for (let i = 0; i < this.indices.length; i++) {
      const otherVal = otherMap.get(this.indices[i]);
      if (otherVal !== undefined) {
        sum += this.values[i] * otherVal;
      }
    }

    return sum;
  }

  /**
   * Create sparse vector from dense
   */
  static fromDense(dense, threshold = 0.0) {
    const indices = [];
    const values = [];

    for (let i = 0; i < dense.length; i++) {
      if (Math.abs(dense[i]) > threshold) {
        indices.push(i);
        values.push(dense[i]);
      }
    }

    return new SparseVector(indices, values, dense.length);
  }
}

/**
 * Main Vector Engine
 */
class VectorEngine {
  constructor(options = {}) {
    this.dimensions = options.dimensions || 384;
    this.metric = options.metric || 'cosine';
    this.compressionEnabled = options.compression || false;
    this.useHNSW = options.useHNSW !== false;

    // Initialize HNSW index
    this.index = new HNSWIndex(
      this.dimensions,
      options.M || 16,
      options.efConstruction || 200
    );
    this.index.setMetric(this.metric);

    // Multi-vector storage
    this.vectors = new Map();
    this.denseVectors = new Map();
    this.sparseVectors = new Map();
    this.metadata = new Map();

    // Product quantizer for compression
    this.quantizer = null;
    if (this.compressionEnabled) {
      this.quantizer = new ProductQuantizer(
        this.dimensions,
        options.numSubvectors || 8,
        options.numCentroids || 256
      );
    }

    // Performance metrics
    this.metrics = {
      insertions: 0,
      searches: 0,
      totalSearchTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Search cache
    this.searchCache = new Map();
    this.cacheMaxSize = options.cacheSize || 1000;
  }

  /**
   * Train compression quantizer
   * @param {number[][]} sampleVectors - Sample vectors for training
   */
  trainCompression(sampleVectors) {
    if (!this.compressionEnabled || !this.quantizer) {
      throw new Error('Compression not enabled');
    }

    this.quantizer.train(sampleVectors);
    console.log(`✓ Quantizer trained on ${sampleVectors.length} samples`);
  }

  /**
   * Insert single vector
   * @param {string} id - Vector ID
   * @param {number[]} vector - Dense vector
   * @param {Object} options - Additional options
   */
  insert(id, vector, options = {}) {
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`);
    }

    try {
      const metadata = options.metadata || {};
      const sparseVector = options.sparse || null;

      // Store dense vector
      this.denseVectors.set(id, vector);
      this.metadata.set(id, metadata);

      // Store sparse vector if provided
      if (sparseVector) {
        this.sparseVectors.set(id, sparseVector);
      }

      // Insert into HNSW index
      if (this.useHNSW) {
        this.index.insert(id, vector, metadata);
      }

      // Compress if enabled
      if (this.compressionEnabled && this.quantizer && this.quantizer.trained) {
        const compressed = this.quantizer.compress(vector);
        this.vectors.set(id, compressed);
      } else {
        this.vectors.set(id, vector);
      }

      this.metrics.insertions++;

      // Clear cache on updates
      this.searchCache.clear();

      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch insert vectors
   * @param {Array} items - Array of {id, vector, metadata}
   */
  batchInsert(items) {
    const results = [];
    const startTime = Date.now();

    for (const item of items) {
      const result = this.insert(item.id, item.vector, {
        metadata: item.metadata,
        sparse: item.sparse
      });
      results.push(result);
    }

    const duration = Date.now() - startTime;
    console.log(`✓ Batch inserted ${items.length} vectors in ${duration}ms`);

    return {
      success: results.every(r => r.success),
      results,
      duration
    };
  }

  /**
   * Search for similar vectors
   * @param {number[]} query - Query vector
   * @param {Object} options - Search options
   */
  search(query, options = {}) {
    const startTime = Date.now();
    const k = options.k || 10;
    const ef = options.ef || 50;
    const filters = options.filters || {};
    const hybridAlpha = options.hybridAlpha || 0.5;

    try {
      // Check cache
      const cacheKey = this._getCacheKey(query, options);
      if (this.searchCache.has(cacheKey)) {
        this.metrics.cacheHits++;
        return this.searchCache.get(cacheKey);
      }
      this.metrics.cacheMisses++;

      let results;

      // Hybrid search if sparse query provided
      if (options.sparseQuery && this.sparseVectors.size > 0) {
        results = this._hybridSearch(query, options.sparseQuery, k, hybridAlpha, filters);
      }
      // Regular dense search
      else if (this.useHNSW) {
        results = this.index.search(query, k, ef);
      }
      // Fallback to brute force
      else {
        results = this._bruteForceSearch(query, k, filters);
      }

      // Apply metadata filters
      if (Object.keys(filters).length > 0) {
        results = results.filter(r => this._matchesFilters(r.metadata, filters));
      }

      const duration = Date.now() - startTime;
      this.metrics.searches++;
      this.metrics.totalSearchTime += duration;

      const finalResults = {
        results: results.slice(0, k),
        duration,
        fromCache: false
      };

      // Cache results
      if (this.searchCache.size >= this.cacheMaxSize) {
        const firstKey = this.searchCache.keys().next().value;
        this.searchCache.delete(firstKey);
      }
      this.searchCache.set(cacheKey, finalResults);

      return finalResults;
    } catch (error) {
      return { error: error.message, results: [] };
    }
  }

  /**
   * Hybrid search combining dense and sparse vectors
   * @private
   */
  _hybridSearch(denseQuery, sparseQuery, k, alpha, filters) {
    // Dense search
    const denseResults = this.useHNSW
      ? this.index.search(denseQuery, k * 2)
      : this._bruteForceSearch(denseQuery, k * 2, filters);

    // Sparse search
    const sparseResults = [];
    for (const [id, sparseVec] of this.sparseVectors.entries()) {
      const score = sparseQuery.dotProduct(sparseVec);
      sparseResults.push({
        id,
        score,
        vector: this.denseVectors.get(id),
        metadata: this.metadata.get(id)
      });
    }
    sparseResults.sort((a, b) => b.score - a.score);

    // Combine scores
    const combined = new Map();

    // Add dense results
    for (const result of denseResults) {
      combined.set(result.id, {
        ...result,
        denseScore: result.score,
        sparseScore: 0,
        combinedScore: result.score * alpha
      });
    }

    // Add/merge sparse results
    for (const result of sparseResults) {
      if (combined.has(result.id)) {
        const existing = combined.get(result.id);
        existing.sparseScore = result.score;
        existing.combinedScore = alpha * existing.denseScore + (1 - alpha) * result.score;
      } else {
        combined.set(result.id, {
          ...result,
          denseScore: 0,
          sparseScore: result.score,
          combinedScore: (1 - alpha) * result.score
        });
      }
    }

    // Sort by combined score
    return Array.from(combined.values())
      .sort((a, b) => b.combinedScore - a.score)
      .slice(0, k);
  }

  /**
   * Brute force search fallback
   * @private
   */
  _bruteForceSearch(query, k, filters) {
    const results = [];

    for (const [id, vector] of this.denseVectors.entries()) {
      const metadata = this.metadata.get(id);

      if (Object.keys(filters).length > 0 && !this._matchesFilters(metadata, filters)) {
        continue;
      }

      const score = SimilarityMetrics.cosine(query, vector);
      results.push({ id, score, vector, metadata });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }

  /**
   * Check if metadata matches filters
   * @private
   */
  _matchesFilters(metadata, filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        if (!value.includes(metadata[key])) return false;
      } else if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate cache key
   * @private
   */
  _getCacheKey(query, options) {
    const key = query.slice(0, 10).join(',') + JSON.stringify(options);
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Update vector
   * @param {string} id - Vector ID
   * @param {number[]} vector - New vector
   * @param {Object} options - Update options
   */
  update(id, vector, options = {}) {
    if (!this.denseVectors.has(id)) {
      return { success: false, error: 'Vector not found' };
    }

    // Remove old entry
    this.remove(id);

    // Insert new entry
    return this.insert(id, vector, options);
  }

  /**
   * Remove vector
   * @param {string} id - Vector ID
   */
  remove(id) {
    const existed = this.denseVectors.has(id);

    this.denseVectors.delete(id);
    this.sparseVectors.delete(id);
    this.metadata.delete(id);
    this.vectors.delete(id);

    if (this.useHNSW) {
      this.index.remove(id);
    }

    this.searchCache.clear();

    return { success: existed, id };
  }

  /**
   * Get vector by ID
   * @param {string} id - Vector ID
   */
  get(id) {
    if (!this.denseVectors.has(id)) {
      return null;
    }

    return {
      id,
      vector: this.denseVectors.get(id),
      sparse: this.sparseVectors.get(id),
      metadata: this.metadata.get(id)
    };
  }

  /**
   * Vector space transformations
   */
  transform(transformType, params = {}) {
    switch (transformType) {
      case 'normalize':
        return this._normalizeVectors();
      case 'pca':
        return this._pcaTransform(params.components || 128);
      case 'scale':
        return this._scaleVectors(params.factor || 1.0);
      default:
        throw new Error(`Unknown transform type: ${transformType}`);
    }
  }

  /**
   * Normalize all vectors
   * @private
   */
  _normalizeVectors() {
    for (const [id, vector] of this.denseVectors.entries()) {
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        const normalized = vector.map(val => val / norm);
        this.denseVectors.set(id, normalized);
      }
    }
    this.searchCache.clear();
    return { success: true, message: 'Vectors normalized' };
  }

  /**
   * Scale vectors
   * @private
   */
  _scaleVectors(factor) {
    for (const [id, vector] of this.denseVectors.entries()) {
      const scaled = vector.map(val => val * factor);
      this.denseVectors.set(id, scaled);
    }
    this.searchCache.clear();
    return { success: true, message: `Vectors scaled by ${factor}` };
  }

  /**
   * Simple PCA transform (dimension reduction)
   * @private
   */
  _pcaTransform(components) {
    // This is a simplified PCA - in production, use a proper ML library
    console.warn('PCA transform is simplified - consider using a proper ML library');

    const vectors = Array.from(this.denseVectors.values());
    if (vectors.length === 0) return { success: false, error: 'No vectors to transform' };

    // For now, just truncate to target dimensions
    for (const [id, vector] of this.denseVectors.entries()) {
      this.denseVectors.set(id, vector.slice(0, components));
    }

    this.dimensions = components;
    this.searchCache.clear();

    return {
      success: true,
      message: `Dimensions reduced to ${components}`,
      newDimensions: components
    };
  }

  /**
   * Rebalance HNSW index for better performance
   */
  rebalance() {
    if (!this.useHNSW) {
      return { success: false, error: 'HNSW not enabled' };
    }

    const startTime = Date.now();
    const vectors = Array.from(this.denseVectors.entries());

    // Recreate index
    this.index = new HNSWIndex(
      this.dimensions,
      this.index.M,
      this.index.efConstruction
    );
    this.index.setMetric(this.metric);

    // Reinsert all vectors
    for (const [id, vector] of vectors) {
      const metadata = this.metadata.get(id);
      this.index.insert(id, vector, metadata);
    }

    this.searchCache.clear();
    const duration = Date.now() - startTime;

    return {
      success: true,
      duration,
      message: `Index rebalanced in ${duration}ms`
    };
  }

  /**
   * Get engine statistics
   */
  getStats() {
    const avgSearchTime = this.metrics.searches > 0
      ? this.metrics.totalSearchTime / this.metrics.searches
      : 0;

    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)
      : 0;

    return {
      vectors: {
        total: this.denseVectors.size,
        dense: this.denseVectors.size,
        sparse: this.sparseVectors.size,
        dimensions: this.dimensions
      },
      index: this.useHNSW ? this.index.getStats() : { type: 'brute-force' },
      performance: {
        insertions: this.metrics.insertions,
        searches: this.metrics.searches,
        avgSearchTime: avgSearchTime.toFixed(2) + 'ms',
        cacheHitRate: (cacheHitRate * 100).toFixed(1) + '%',
        cacheSize: this.searchCache.size
      },
      compression: {
        enabled: this.compressionEnabled,
        trained: this.quantizer ? this.quantizer.trained : false
      }
    };
  }

  /**
   * Export index to JSON
   */
  export() {
    return {
      dimensions: this.dimensions,
      metric: this.metric,
      vectors: Array.from(this.denseVectors.entries()),
      sparse: Array.from(this.sparseVectors.entries()),
      metadata: Array.from(this.metadata.entries()),
      stats: this.getStats()
    };
  }

  /**
   * Import index from JSON
   */
  import(data) {
    this.dimensions = data.dimensions;
    this.metric = data.metric;

    // Clear existing data
    this.denseVectors.clear();
    this.sparseVectors.clear();
    this.metadata.clear();
    this.searchCache.clear();

    // Import vectors
    for (const [id, vector] of data.vectors) {
      this.insert(id, vector, {
        metadata: data.metadata.find(([mid]) => mid === id)?.[1] || {},
        sparse: data.sparse?.find(([sid]) => sid === id)?.[1]
      });
    }

    return { success: true, imported: data.vectors.length };
  }

  /**
   * Clear all data
   */
  clear() {
    this.denseVectors.clear();
    this.sparseVectors.clear();
    this.metadata.clear();
    this.vectors.clear();
    this.searchCache.clear();

    this.index = new HNSWIndex(this.dimensions);
    this.index.setMetric(this.metric);

    this.metrics = {
      insertions: 0,
      searches: 0,
      totalSearchTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    return { success: true };
  }
}

// Export all classes
module.exports = {
  VectorEngine,
  HNSWIndex,
  ProductQuantizer,
  SparseVector,
  SimilarityMetrics
};
