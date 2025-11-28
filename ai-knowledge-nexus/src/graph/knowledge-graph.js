/**
 * Knowledge Graph System
 *
 * Advanced knowledge graph construction and analysis system with:
 * - Automatic entity extraction and relationship detection
 * - Ontology learning and graph neural networks
 * - Community detection and centrality analysis
 * - Multi-hop reasoning and temporal graphs
 * - LLM-powered relation extraction
 * - Visual graph export capabilities
 */

import natural from 'natural';
import { Matrix } from 'ml-matrix';
import * as tf from '@tensorflow/tfjs-node';

// ============================================================================
// CORE KNOWLEDGE GRAPH ENGINE
// ============================================================================

export class KnowledgeGraph {
  constructor(config = {}) {
    this.config = {
      enableTemporal: config.enableTemporal ?? true,
      enableEmbeddings: config.enableEmbeddings ?? true,
      embeddingDim: config.embeddingDim ?? 128,
      maxEntities: config.maxEntities ?? 10000,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      ...config
    };

    // Graph storage
    this.entities = new Map(); // entity_id -> Entity
    this.relationships = new Map(); // rel_id -> Relationship
    this.triples = []; // [subject, predicate, object] triples

    // Indexes for fast lookup
    this.entityIndex = new Map(); // name -> entity_id
    this.relationshipIndex = new Map(); // type -> rel_ids[]
    this.temporalIndex = new Map(); // timestamp -> events[]

    // Graph structure
    this.adjacencyList = new Map(); // entity_id -> [connected_entity_ids]
    this.reverseAdjacencyList = new Map(); // for reverse lookups

    // Machine learning models
    this.entityEmbeddings = new Map();
    this.relationEmbeddings = new Map();
    this.gnnModel = null;

    // Analytics cache
    this.centralityCache = new Map();
    this.communityCache = null;

    // Ontology
    this.ontology = new OntologyManager();

    // Statistics
    this.stats = {
      entitiesCount: 0,
      relationshipsCount: 0,
      avgDegree: 0,
      density: 0
    };
  }

  // ==========================================================================
  // 1. AUTOMATIC ENTITY EXTRACTION
  // ==========================================================================

  async extractEntitiesFromText(text, options = {}) {
    const {
      useNER = true,
      usePOS = true,
      usePatterns = true,
      minConfidence = this.config.confidenceThreshold
    } = options;

    const entities = [];

    // Named Entity Recognition
    if (useNER) {
      const nerEntities = await this._performNER(text);
      entities.push(...nerEntities);
    }

    // Part-of-Speech tagging for noun extraction
    if (usePOS) {
      const posEntities = this._extractEntitiesFromPOS(text);
      entities.push(...posEntities);
    }

    // Pattern-based extraction
    if (usePatterns) {
      const patternEntities = this._extractEntitiesFromPatterns(text);
      entities.push(...patternEntities);
    }

    // Deduplicate and filter by confidence
    const uniqueEntities = this._deduplicateEntities(entities);
    const filteredEntities = uniqueEntities.filter(e => e.confidence >= minConfidence);

    // Add to graph
    for (const entity of filteredEntities) {
      this.addEntity(entity);
    }

    return filteredEntities;
  }

  async _performNER(text) {
    const entities = [];
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text);

    // Simple NER using patterns and dictionaries
    // In production, use spaCy, Stanford NER, or transformer models
    const patterns = {
      PERSON: /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g,
      ORGANIZATION: /\b[A-Z][a-z]+\s(?:Inc|Corp|LLC|Ltd|Company|Organization)\b/g,
      LOCATION: /\b(?:in|at|from)\s([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g,
      DATE: /\b\d{4}-\d{2}-\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s\d{1,2},?\s\d{4}\b/g,
      NUMBER: /\b\d+(?:\.\d+)?\b/g
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        entities.push({
          text: match[0],
          type,
          confidence: 0.85,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return entities;
  }

  _extractEntitiesFromPOS(text) {
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text);
    const tagger = new natural.BrillPOSTagger();

    const tagged = tagger.tag(tokens);
    const entities = [];

    // Extract noun phrases
    let nounPhrase = [];
    for (let i = 0; i < tagged.taggedWords.length; i++) {
      const { token, tag } = tagged.taggedWords[i];

      if (tag.startsWith('NN') || tag.startsWith('JJ')) {
        nounPhrase.push(token);
      } else if (nounPhrase.length > 0) {
        if (nounPhrase.length >= 1) {
          entities.push({
            text: nounPhrase.join(' '),
            type: 'CONCEPT',
            confidence: 0.7,
            start: -1,
            end: -1
          });
        }
        nounPhrase = [];
      }
    }

    return entities;
  }

  _extractEntitiesFromPatterns(text) {
    const entities = [];

    // Domain-specific patterns
    const patterns = [
      { regex: /\b[A-Z]{2,}\b/g, type: 'ACRONYM' },
      { regex: /\bhttps?:\/\/[^\s]+/g, type: 'URL' },
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'EMAIL' },
      { regex: /\$\d+(?:\.\d{2})?/g, type: 'MONEY' }
    ];

    for (const { regex, type } of patterns) {
      const matches = [...text.matchAll(regex)];
      for (const match of matches) {
        entities.push({
          text: match[0],
          type,
          confidence: 0.9,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    return entities;
  }

  _deduplicateEntities(entities) {
    const seen = new Map();
    const unique = [];

    for (const entity of entities) {
      const key = `${entity.text.toLowerCase()}_${entity.type}`;
      const existing = seen.get(key);

      if (!existing || entity.confidence > existing.confidence) {
        if (existing) {
          unique[unique.indexOf(existing)] = entity;
        } else {
          unique.push(entity);
        }
        seen.set(key, entity);
      }
    }

    return unique;
  }

  // ==========================================================================
  // 2. RELATIONSHIP DETECTION
  // ==========================================================================

  async detectRelationships(text, entities, options = {}) {
    const {
      useDependencyParsing = true,
      usePatterns = true,
      useLLM = false,
      llmProvider = null
    } = options;

    const relationships = [];

    // Dependency parsing-based extraction
    if (useDependencyParsing) {
      const depRels = this._extractFromDependencies(text, entities);
      relationships.push(...depRels);
    }

    // Pattern-based extraction
    if (usePatterns) {
      const patternRels = this._extractFromPatterns(text, entities);
      relationships.push(...patternRels);
    }

    // LLM-based extraction
    if (useLLM && llmProvider) {
      const llmRels = await this._extractWithLLM(text, entities, llmProvider);
      relationships.push(...llmRels);
    }

    // Add relationships to graph
    for (const rel of relationships) {
      this.addRelationship(rel.subject, rel.predicate, rel.object, rel.metadata);
    }

    return relationships;
  }

  _extractFromDependencies(text, entities) {
    // Simplified dependency parsing
    // In production, use spaCy or Stanford CoreNLP
    const relationships = [];
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      // Find verb phrases between entities
      const verbPattern = /\b(?:is|are|was|were|has|have|had|does|do|did)\s+(\w+(?:\s+\w+)*)/g;
      const matches = [...sentence.matchAll(verbPattern)];

      for (const match of matches) {
        const predicate = match[1];

        // Find entities in this sentence
        const sentenceEntities = entities.filter(e =>
          sentence.includes(e.text)
        );

        // Create relationships between consecutive entities
        for (let i = 0; i < sentenceEntities.length - 1; i++) {
          relationships.push({
            subject: sentenceEntities[i].text,
            predicate: predicate.trim(),
            object: sentenceEntities[i + 1].text,
            confidence: 0.7,
            metadata: { source: 'dependency_parsing' }
          });
        }
      }
    }

    return relationships;
  }

  _extractFromPatterns(text, entities) {
    const relationships = [];

    // Relation patterns
    const patterns = [
      { regex: /(\w+)\s+(?:is|are)\s+(?:a|an|the)\s+(\w+)/g, type: 'IS_A' },
      { regex: /(\w+)\s+(?:has|have)\s+(?:a|an|the)?\s*(\w+)/g, type: 'HAS' },
      { regex: /(\w+)\s+(?:works for|works at|employed by)\s+(\w+)/g, type: 'EMPLOYED_BY' },
      { regex: /(\w+)\s+(?:located in|based in|from)\s+(\w+)/g, type: 'LOCATED_IN' },
      { regex: /(\w+)\s+(?:founded|created|established)\s+(\w+)/g, type: 'FOUNDED' },
      { regex: /(\w+)\s+(?:owns|acquired|purchased)\s+(\w+)/g, type: 'OWNS' }
    ];

    for (const { regex, type } of patterns) {
      const matches = [...text.matchAll(regex)];
      for (const match of matches) {
        relationships.push({
          subject: match[1],
          predicate: type,
          object: match[2],
          confidence: 0.8,
          metadata: { source: 'pattern_matching' }
        });
      }
    }

    return relationships;
  }

  async _extractWithLLM(text, entities, llmProvider) {
    // LLM-based relation extraction
    const prompt = `
Extract relationships from the following text. Format: (subject, predicate, object)

Text: ${text}

Entities: ${entities.map(e => e.text).join(', ')}

Relationships:`;

    const response = await llmProvider.generate(prompt);
    const relationships = this._parseLLMResponse(response);

    return relationships.map(rel => ({
      ...rel,
      confidence: 0.85,
      metadata: { source: 'llm_extraction' }
    }));
  }

  _parseLLMResponse(response) {
    const relationships = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const match = line.match(/\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
      if (match) {
        relationships.push({
          subject: match[1].trim(),
          predicate: match[2].trim(),
          object: match[3].trim()
        });
      }
    }

    return relationships;
  }

  // ==========================================================================
  // 3. ONTOLOGY LEARNING
  // ==========================================================================

  async learnOntology(options = {}) {
    const {
      minSupport = 0.1,
      minConfidence = 0.5,
      maxDepth = 5
    } = options;

    // Discover class hierarchy
    const hierarchy = this._discoverClassHierarchy(minSupport);

    // Learn property constraints
    const properties = this._learnPropertyConstraints(minConfidence);

    // Infer axioms
    const axioms = this._inferAxioms();

    // Update ontology
    this.ontology.updateHierarchy(hierarchy);
    this.ontology.updateProperties(properties);
    this.ontology.updateAxioms(axioms);

    return {
      hierarchy,
      properties,
      axioms,
      stats: this.ontology.getStats()
    };
  }

  _discoverClassHierarchy(minSupport) {
    const hierarchy = new Map();
    const entityTypes = new Map();

    // Collect entity types
    for (const entity of this.entities.values()) {
      const type = entity.type || 'THING';
      if (!entityTypes.has(type)) {
        entityTypes.set(type, []);
      }
      entityTypes.get(type).push(entity.id);
    }

    // Find IS_A relationships
    for (const rel of this.relationships.values()) {
      if (rel.predicate === 'IS_A' || rel.predicate === 'TYPE_OF') {
        const subclass = this._getEntityType(rel.subject);
        const superclass = this._getEntityType(rel.object);

        if (!hierarchy.has(subclass)) {
          hierarchy.set(subclass, new Set());
        }
        hierarchy.get(subclass).add(superclass);
      }
    }

    // Convert to tree structure
    return this._buildHierarchyTree(hierarchy, entityTypes, minSupport);
  }

  _buildHierarchyTree(hierarchy, entityTypes, minSupport) {
    const tree = { name: 'THING', children: [] };
    const processed = new Set();

    const buildNode = (className, depth = 0) => {
      if (depth > 10 || processed.has(className)) return null;
      processed.add(className);

      const support = (entityTypes.get(className)?.length || 0) / this.entities.size;
      if (support < minSupport) return null;

      const node = {
        name: className,
        support,
        children: []
      };

      if (hierarchy.has(className)) {
        for (const child of hierarchy.get(className)) {
          const childNode = buildNode(child, depth + 1);
          if (childNode) node.children.push(childNode);
        }
      }

      return node;
    };

    for (const className of entityTypes.keys()) {
      if (!processed.has(className)) {
        const node = buildNode(className);
        if (node) tree.children.push(node);
      }
    }

    return tree;
  }

  _learnPropertyConstraints(minConfidence) {
    const properties = new Map();

    for (const rel of this.relationships.values()) {
      const prop = rel.predicate;

      if (!properties.has(prop)) {
        properties.set(prop, {
          name: prop,
          domain: new Map(), // subject types
          range: new Map(),  // object types
          functional: false,
          inverseFunctional: false,
          transitive: false,
          symmetric: false
        });
      }

      const propData = properties.get(prop);

      // Track domain and range
      const subjectType = this._getEntityType(rel.subject);
      const objectType = this._getEntityType(rel.object);

      propData.domain.set(subjectType, (propData.domain.get(subjectType) || 0) + 1);
      propData.range.set(objectType, (propData.range.get(objectType) || 0) + 1);
    }

    // Infer property characteristics
    for (const [prop, data] of properties) {
      const rels = this._getRelationshipsByType(prop);

      // Functional: each subject has at most one object
      data.functional = this._isFunctional(rels, minConfidence);

      // Inverse functional: each object has at most one subject
      data.inverseFunctional = this._isInverseFunctional(rels, minConfidence);

      // Transitive: (a,p,b) ∧ (b,p,c) → (a,p,c)
      data.transitive = this._isTransitive(rels, minConfidence);

      // Symmetric: (a,p,b) → (b,p,a)
      data.symmetric = this._isSymmetric(rels, minConfidence);

      properties.set(prop, data);
    }

    return properties;
  }

  _inferAxioms() {
    const axioms = [];

    // Disjoint classes
    axioms.push(...this._inferDisjointClasses());

    // Equivalent classes
    axioms.push(...this._inferEquivalentClasses());

    // Property chains
    axioms.push(...this._inferPropertyChains());

    return axioms;
  }

  _inferDisjointClasses() {
    // Classes with no common instances are disjoint
    const axioms = [];
    const entityTypes = new Map();

    for (const entity of this.entities.values()) {
      const type = entity.type || 'THING';
      if (!entityTypes.has(type)) {
        entityTypes.set(type, new Set());
      }
      entityTypes.get(type).add(entity.id);
    }

    const types = Array.from(entityTypes.keys());
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const type1 = types[i];
        const type2 = types[j];
        const instances1 = entityTypes.get(type1);
        const instances2 = entityTypes.get(type2);

        const hasCommon = [...instances1].some(id => instances2.has(id));
        if (!hasCommon) {
          axioms.push({
            type: 'DISJOINT_CLASSES',
            classes: [type1, type2],
            confidence: 0.9
          });
        }
      }
    }

    return axioms;
  }

  _inferEquivalentClasses() {
    // Classes with identical instances are equivalent
    const axioms = [];
    const entityTypes = new Map();

    for (const entity of this.entities.values()) {
      const type = entity.type || 'THING';
      if (!entityTypes.has(type)) {
        entityTypes.set(type, new Set());
      }
      entityTypes.get(type).add(entity.id);
    }

    const types = Array.from(entityTypes.entries());
    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const [type1, instances1] = types[i];
        const [type2, instances2] = types[j];

        if (this._areSetsEqual(instances1, instances2)) {
          axioms.push({
            type: 'EQUIVALENT_CLASSES',
            classes: [type1, type2],
            confidence: 1.0
          });
        }
      }
    }

    return axioms;
  }

  _inferPropertyChains() {
    // Find property chains: p1 ∘ p2 → p3
    const axioms = [];
    const propertyTypes = new Map();

    for (const rel of this.relationships.values()) {
      const prop = rel.predicate;
      if (!propertyTypes.has(prop)) {
        propertyTypes.set(prop, []);
      }
      propertyTypes.get(prop).push(rel);
    }

    // Look for chains
    for (const [prop1, rels1] of propertyTypes) {
      for (const rel1 of rels1) {
        for (const [prop2, rels2] of propertyTypes) {
          for (const rel2 of rels2) {
            // Check if rel1.object === rel2.subject
            if (rel1.object === rel2.subject) {
              // Check if there's a direct relationship from rel1.subject to rel2.object
              const direct = this._hasRelationship(rel1.subject, rel2.object);
              if (direct) {
                axioms.push({
                  type: 'PROPERTY_CHAIN',
                  chain: [prop1, prop2],
                  implies: direct.predicate,
                  confidence: 0.7
                });
              }
            }
          }
        }
      }
    }

    return axioms;
  }

  // ==========================================================================
  // 4. GRAPH CONSTRUCTION FROM UNSTRUCTURED DATA
  // ==========================================================================

  async buildGraphFromText(text, options = {}) {
    const {
      chunkSize = 1000,
      overlap = 200,
      enableCoref = true,
      enableTemporal = true
    } = options;

    // Chunk text
    const chunks = this._chunkText(text, chunkSize, overlap);

    const allEntities = [];
    const allRelationships = [];

    for (const chunk of chunks) {
      // Extract entities
      const entities = await this.extractEntitiesFromText(chunk);
      allEntities.push(...entities);

      // Detect relationships
      const relationships = await this.detectRelationships(chunk, entities);
      allRelationships.push(...relationships);
    }

    // Co-reference resolution
    if (enableCoref) {
      this._resolveCoReferences(allEntities, allRelationships);
    }

    // Temporal ordering
    if (enableTemporal) {
      this._extractTemporalInformation(text, allRelationships);
    }

    // Update graph statistics
    this._updateStatistics();

    return {
      entities: allEntities.length,
      relationships: allRelationships.length,
      chunks: chunks.length
    };
  }

  _chunkText(text, chunkSize, overlap) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      start += chunkSize - overlap;
    }

    return chunks;
  }

  _resolveCoReferences(entities, relationships) {
    // Simple co-reference resolution
    // In production, use neural coref or SpanBERT
    const pronouns = new Set(['he', 'she', 'it', 'they', 'him', 'her', 'them', 'his', 'hers', 'their']);
    const entityMap = new Map();

    let lastEntity = null;
    for (const entity of entities) {
      const text = entity.text.toLowerCase();

      if (pronouns.has(text) && lastEntity) {
        // Map pronoun to last mentioned entity
        entityMap.set(entity.text, lastEntity.text);
      } else if (entity.type === 'PERSON' || entity.type === 'ORGANIZATION') {
        lastEntity = entity;
      }
    }

    // Update relationships with resolved references
    for (const rel of relationships) {
      if (entityMap.has(rel.subject)) {
        rel.subject = entityMap.get(rel.subject);
      }
      if (entityMap.has(rel.object)) {
        rel.object = entityMap.get(rel.object);
      }
    }
  }

  _extractTemporalInformation(text, relationships) {
    // Extract temporal expressions
    const temporalPatterns = [
      { regex: /(\d{4}-\d{2}-\d{2})/g, format: 'ISO' },
      { regex: /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/g, format: 'US' },
      { regex: /\d{1,2}\/\d{1,2}\/\d{4}/g, format: 'US_SHORT' }
    ];

    for (const { regex, format } of temporalPatterns) {
      const matches = [...text.matchAll(regex)];
      for (const match of matches) {
        const timestamp = this._parseDate(match[0], format);
        if (timestamp) {
          // Find nearby relationships and add temporal info
          for (const rel of relationships) {
            if (!rel.metadata) rel.metadata = {};
            rel.metadata.timestamp = timestamp;

            // Add to temporal index
            if (!this.temporalIndex.has(timestamp)) {
              this.temporalIndex.set(timestamp, []);
            }
            this.temporalIndex.get(timestamp).push(rel.id);
          }
        }
      }
    }
  }

  _parseDate(dateStr, format) {
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // 5. COMMUNITY DETECTION
  // ==========================================================================

  detectCommunities(algorithm = 'louvain', options = {}) {
    const algorithms = {
      louvain: () => this._louvainCommunities(options),
      labelPropagation: () => this._labelPropagationCommunities(options),
      girvanNewman: () => this._girvanNewmanCommunities(options),
      infomap: () => this._infomapCommunities(options)
    };

    if (!algorithms[algorithm]) {
      throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    this.communityCache = algorithms[algorithm]();
    return this.communityCache;
  }

  _louvainCommunities(options = {}) {
    const { resolution = 1.0, maxIterations = 100 } = options;

    // Initialize: each node in its own community
    const communities = new Map();
    let nodeId = 0;
    for (const entityId of this.entities.keys()) {
      communities.set(entityId, nodeId++);
    }

    let improved = true;
    let iteration = 0;

    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      // For each node, try moving to neighbor communities
      for (const nodeId of this.entities.keys()) {
        const currentCommunity = communities.get(nodeId);
        let bestCommunity = currentCommunity;
        let bestGain = 0;

        // Get neighbor communities
        const neighbors = this.adjacencyList.get(nodeId) || [];
        const neighborCommunities = new Set(
          neighbors.map(n => communities.get(n))
        );

        for (const targetCommunity of neighborCommunities) {
          if (targetCommunity === currentCommunity) continue;

          const gain = this._modularityGain(
            nodeId,
            currentCommunity,
            targetCommunity,
            communities,
            resolution
          );

          if (gain > bestGain) {
            bestGain = gain;
            bestCommunity = targetCommunity;
          }
        }

        if (bestCommunity !== currentCommunity) {
          communities.set(nodeId, bestCommunity);
          improved = true;
        }
      }
    }

    // Group nodes by community
    const result = new Map();
    for (const [nodeId, communityId] of communities) {
      if (!result.has(communityId)) {
        result.set(communityId, []);
      }
      result.get(communityId).push(nodeId);
    }

    return {
      communities: Array.from(result.values()),
      modularity: this._calculateModularity(communities),
      iterations: iteration
    };
  }

  _modularityGain(node, fromCommunity, toCommunity, communities, resolution) {
    // Simplified modularity gain calculation
    const m = this.relationships.size; // Total edges
    const neighbors = this.adjacencyList.get(node) || [];

    let ki_in_from = 0;
    let ki_in_to = 0;

    for (const neighbor of neighbors) {
      if (communities.get(neighbor) === fromCommunity) ki_in_from++;
      if (communities.get(neighbor) === toCommunity) ki_in_to++;
    }

    const ki = neighbors.length;
    const gain = (ki_in_to - ki_in_from) / (2 * m) -
                 resolution * ki * (ki_in_to - ki_in_from) / (2 * m * m);

    return gain;
  }

  _calculateModularity(communities) {
    const m = this.relationships.size;
    if (m === 0) return 0;

    let modularity = 0;
    const communityGroups = new Map();

    for (const [node, community] of communities) {
      if (!communityGroups.has(community)) {
        communityGroups.set(community, []);
      }
      communityGroups.get(community).push(node);
    }

    for (const nodes of communityGroups.values()) {
      let lc = 0;
      let dc = 0;

      for (const node of nodes) {
        const neighbors = this.adjacencyList.get(node) || [];
        dc += neighbors.length;

        for (const neighbor of neighbors) {
          if (nodes.includes(neighbor)) {
            lc++;
          }
        }
      }

      modularity += (lc / (2 * m)) - Math.pow(dc / (2 * m), 2);
    }

    return modularity;
  }

  _labelPropagationCommunities(options = {}) {
    const { maxIterations = 100 } = options;

    // Initialize: each node with unique label
    const labels = new Map();
    let labelId = 0;
    for (const entityId of this.entities.keys()) {
      labels.set(entityId, labelId++);
    }

    for (let iter = 0; iter < maxIterations; iter++) {
      let changed = false;
      const nodes = Array.from(this.entities.keys());

      // Randomize order
      for (let i = nodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
      }

      for (const node of nodes) {
        const neighbors = this.adjacencyList.get(node) || [];
        if (neighbors.length === 0) continue;

        // Count neighbor labels
        const labelCounts = new Map();
        for (const neighbor of neighbors) {
          const label = labels.get(neighbor);
          labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
        }

        // Find most common label
        let maxCount = 0;
        let maxLabel = labels.get(node);
        for (const [label, count] of labelCounts) {
          if (count > maxCount) {
            maxCount = count;
            maxLabel = label;
          }
        }

        if (maxLabel !== labels.get(node)) {
          labels.set(node, maxLabel);
          changed = true;
        }
      }

      if (!changed) break;
    }

    // Group by label
    const communities = new Map();
    for (const [node, label] of labels) {
      if (!communities.has(label)) {
        communities.set(label, []);
      }
      communities.get(label).push(node);
    }

    return {
      communities: Array.from(communities.values()),
      modularity: this._calculateModularity(labels)
    };
  }

  _girvanNewmanCommunities(options = {}) {
    const { targetCommunities = null } = options;

    // Copy graph
    const edges = new Set(this.relationships.keys());
    const communities = [Array.from(this.entities.keys())];

    while (edges.size > 0) {
      if (targetCommunities && communities.length >= targetCommunities) {
        break;
      }

      // Calculate edge betweenness
      const betweenness = this._calculateEdgeBetweenness(edges);

      // Remove edge with highest betweenness
      let maxBetweenness = 0;
      let edgeToRemove = null;

      for (const [edge, value] of betweenness) {
        if (value > maxBetweenness) {
          maxBetweenness = value;
          edgeToRemove = edge;
        }
      }

      if (edgeToRemove) {
        edges.delete(edgeToRemove);

        // Check if graph is now disconnected
        const components = this._findConnectedComponents(edges);
        if (components.length > communities.length) {
          communities.length = 0;
          communities.push(...components);
        }
      } else {
        break;
      }
    }

    return {
      communities,
      modularity: this._calculateModularity(this._communitiesToMap(communities))
    };
  }

  _calculateEdgeBetweenness(edges) {
    const betweenness = new Map();

    for (const edge of edges) {
      betweenness.set(edge, 0);
    }

    // For each pair of nodes, find shortest paths
    for (const source of this.entities.keys()) {
      const paths = this._singleSourceShortestPaths(source, edges);

      for (const target of this.entities.keys()) {
        if (source === target) continue;

        const path = paths.get(target);
        if (path) {
          // Increment betweenness for each edge in path
          for (let i = 0; i < path.length - 1; i++) {
            const edge = this._findEdgeBetween(path[i], path[i + 1]);
            if (edge && betweenness.has(edge)) {
              betweenness.set(edge, betweenness.get(edge) + 1);
            }
          }
        }
      }
    }

    return betweenness;
  }

  _findConnectedComponents(edges) {
    const visited = new Set();
    const components = [];

    for (const node of this.entities.keys()) {
      if (visited.has(node)) continue;

      const component = [];
      const queue = [node];
      visited.add(node);

      while (queue.length > 0) {
        const current = queue.shift();
        component.push(current);

        const neighbors = this.adjacencyList.get(current) || [];
        for (const neighbor of neighbors) {
          // Check if edge exists
          const edge = this._findEdgeBetween(current, neighbor);
          if (edge && edges.has(edge) && !visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      if (component.length > 0) {
        components.push(component);
      }
    }

    return components;
  }

  _infomapCommunities(options = {}) {
    // Simplified Infomap implementation
    // In production, use the actual Infomap algorithm
    return this._louvainCommunities(options);
  }

  _communitiesToMap(communities) {
    const map = new Map();
    for (let i = 0; i < communities.length; i++) {
      for (const node of communities[i]) {
        map.set(node, i);
      }
    }
    return map;
  }

  // ==========================================================================
  // 6. CENTRALITY ANALYSIS
  // ==========================================================================

  calculateCentrality(type = 'all', options = {}) {
    const types = type === 'all'
      ? ['degree', 'betweenness', 'closeness', 'eigenvector', 'pagerank']
      : [type];

    const results = {};

    for (const centralityType of types) {
      const cacheKey = `${centralityType}_${JSON.stringify(options)}`;

      if (this.centralityCache.has(cacheKey)) {
        results[centralityType] = this.centralityCache.get(cacheKey);
        continue;
      }

      switch (centralityType) {
        case 'degree':
          results.degree = this._degreeCentrality(options);
          break;
        case 'betweenness':
          results.betweenness = this._betweennessCentrality(options);
          break;
        case 'closeness':
          results.closeness = this._closenessCentrality(options);
          break;
        case 'eigenvector':
          results.eigenvector = this._eigenvectorCentrality(options);
          break;
        case 'pagerank':
          results.pagerank = this._pageRankCentrality(options);
          break;
      }

      this.centralityCache.set(cacheKey, results[centralityType]);
    }

    return results;
  }

  _degreeCentrality(options = {}) {
    const { normalized = true } = options;
    const centrality = new Map();
    const n = this.entities.size;

    for (const [entityId, entity] of this.entities) {
      const degree = (this.adjacencyList.get(entityId) || []).length;
      const value = normalized && n > 1 ? degree / (n - 1) : degree;
      centrality.set(entityId, value);
    }

    return this._sortCentrality(centrality);
  }

  _betweennessCentrality(options = {}) {
    const { normalized = true } = options;
    const centrality = new Map();
    const n = this.entities.size;

    // Initialize
    for (const entityId of this.entities.keys()) {
      centrality.set(entityId, 0);
    }

    // For each pair of nodes
    for (const source of this.entities.keys()) {
      // Single-source shortest paths
      const { distances, paths, pathCounts } = this._dijkstraAllPaths(source);

      for (const target of this.entities.keys()) {
        if (source === target) continue;

        const shortestPaths = paths.get(target) || [];
        const totalPaths = pathCounts.get(target) || 1;

        // Count paths through each node
        for (const path of shortestPaths) {
          for (let i = 1; i < path.length - 1; i++) {
            const node = path[i];
            centrality.set(node, centrality.get(node) + 1 / totalPaths);
          }
        }
      }
    }

    // Normalize
    if (normalized && n > 2) {
      const factor = 1 / ((n - 1) * (n - 2));
      for (const [node, value] of centrality) {
        centrality.set(node, value * factor);
      }
    }

    return this._sortCentrality(centrality);
  }

  _closenessCentrality(options = {}) {
    const { normalized = true } = options;
    const centrality = new Map();
    const n = this.entities.size;

    for (const source of this.entities.keys()) {
      const distances = this._dijkstra(source);

      let totalDistance = 0;
      let reachable = 0;

      for (const [target, distance] of distances) {
        if (target !== source && distance < Infinity) {
          totalDistance += distance;
          reachable++;
        }
      }

      if (reachable === 0) {
        centrality.set(source, 0);
      } else {
        const closeness = reachable / totalDistance;
        const value = normalized && n > 1 ? closeness * reachable / (n - 1) : closeness;
        centrality.set(source, value);
      }
    }

    return this._sortCentrality(centrality);
  }

  _eigenvectorCentrality(options = {}) {
    const { maxIterations = 100, tolerance = 1e-6 } = options;
    const n = this.entities.size;

    // Initialize with equal values
    const centrality = new Map();
    for (const entityId of this.entities.keys()) {
      centrality.set(entityId, 1 / Math.sqrt(n));
    }

    // Power iteration
    for (let iter = 0; iter < maxIterations; iter++) {
      const newCentrality = new Map();
      let norm = 0;

      for (const [entityId, value] of this.entities) {
        const neighbors = this.adjacencyList.get(entityId) || [];
        let sum = 0;

        for (const neighbor of neighbors) {
          sum += centrality.get(neighbor) || 0;
        }

        newCentrality.set(entityId, sum);
        norm += sum * sum;
      }

      // Normalize
      norm = Math.sqrt(norm);
      if (norm > 0) {
        for (const [entityId, value] of newCentrality) {
          newCentrality.set(entityId, value / norm);
        }
      }

      // Check convergence
      let maxDiff = 0;
      for (const entityId of this.entities.keys()) {
        const diff = Math.abs(newCentrality.get(entityId) - centrality.get(entityId));
        maxDiff = Math.max(maxDiff, diff);
      }

      if (maxDiff < tolerance) {
        return this._sortCentrality(newCentrality);
      }

      // Update centrality
      for (const [entityId, value] of newCentrality) {
        centrality.set(entityId, value);
      }
    }

    return this._sortCentrality(centrality);
  }

  _pageRankCentrality(options = {}) {
    const {
      dampingFactor = 0.85,
      maxIterations = 100,
      tolerance = 1e-6
    } = options;

    const n = this.entities.size;
    const pageRank = new Map();

    // Initialize
    for (const entityId of this.entities.keys()) {
      pageRank.set(entityId, 1 / n);
    }

    // Iterate
    for (let iter = 0; iter < maxIterations; iter++) {
      const newPageRank = new Map();

      for (const entityId of this.entities.keys()) {
        // Base probability
        let sum = (1 - dampingFactor) / n;

        // Incoming links
        const incomingNeighbors = this.reverseAdjacencyList.get(entityId) || [];
        for (const neighbor of incomingNeighbors) {
          const neighborOutDegree = (this.adjacencyList.get(neighbor) || []).length;
          if (neighborOutDegree > 0) {
            sum += dampingFactor * pageRank.get(neighbor) / neighborOutDegree;
          }
        }

        newPageRank.set(entityId, sum);
      }

      // Check convergence
      let maxDiff = 0;
      for (const entityId of this.entities.keys()) {
        const diff = Math.abs(newPageRank.get(entityId) - pageRank.get(entityId));
        maxDiff = Math.max(maxDiff, diff);
      }

      if (maxDiff < tolerance) {
        return this._sortCentrality(newPageRank);
      }

      // Update
      for (const [entityId, value] of newPageRank) {
        pageRank.set(entityId, value);
      }
    }

    return this._sortCentrality(pageRank);
  }

  _sortCentrality(centrality) {
    return Array.from(centrality.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([entityId, value]) => ({
        entityId,
        entity: this.entities.get(entityId),
        centrality: value
      }));
  }

  // ==========================================================================
  // 7. PATH FINDING ALGORITHMS
  // ==========================================================================

  findPath(sourceId, targetId, algorithm = 'dijkstra', options = {}) {
    const algorithms = {
      dijkstra: () => this._dijkstraPath(sourceId, targetId, options),
      astar: () => this._astarPath(sourceId, targetId, options),
      bfs: () => this._bfsPath(sourceId, targetId, options),
      dfs: () => this._dfsPath(sourceId, targetId, options)
    };

    if (!algorithms[algorithm]) {
      throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    return algorithms[algorithm]();
  }

  findAllPaths(sourceId, targetId, options = {}) {
    const { maxLength = 10, maxPaths = 100 } = options;
    const paths = [];
    const visited = new Set();

    const dfs = (current, target, path) => {
      if (paths.length >= maxPaths) return;
      if (path.length > maxLength) return;

      if (current === target) {
        paths.push([...path]);
        return;
      }

      visited.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          path.push(neighbor);
          dfs(neighbor, target, path);
          path.pop();
        }
      }

      visited.delete(current);
    };

    dfs(sourceId, targetId, [sourceId]);
    return paths;
  }

  _dijkstra(sourceId) {
    const distances = new Map();
    const visited = new Set();
    const queue = [[sourceId, 0]];

    // Initialize distances
    for (const entityId of this.entities.keys()) {
      distances.set(entityId, Infinity);
    }
    distances.set(sourceId, 0);

    while (queue.length > 0) {
      queue.sort((a, b) => a[1] - b[1]);
      const [current, currentDistance] = queue.shift();

      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;

        const weight = this._getEdgeWeight(current, neighbor);
        const distance = currentDistance + weight;

        if (distance < distances.get(neighbor)) {
          distances.set(neighbor, distance);
          queue.push([neighbor, distance]);
        }
      }
    }

    return distances;
  }

  _dijkstraPath(sourceId, targetId, options = {}) {
    const distances = new Map();
    const previous = new Map();
    const visited = new Set();
    const queue = [[sourceId, 0]];

    for (const entityId of this.entities.keys()) {
      distances.set(entityId, Infinity);
    }
    distances.set(sourceId, 0);

    while (queue.length > 0) {
      queue.sort((a, b) => a[1] - b[1]);
      const [current, currentDistance] = queue.shift();

      if (current === targetId) break;
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;

        const weight = this._getEdgeWeight(current, neighbor);
        const distance = currentDistance + weight;

        if (distance < distances.get(neighbor)) {
          distances.set(neighbor, distance);
          previous.set(neighbor, current);
          queue.push([neighbor, distance]);
        }
      }
    }

    // Reconstruct path
    return this._reconstructPath(previous, sourceId, targetId, distances.get(targetId));
  }

  _dijkstraAllPaths(sourceId) {
    const distances = new Map();
    const paths = new Map();
    const pathCounts = new Map();
    const visited = new Set();
    const queue = [[sourceId, 0]];

    for (const entityId of this.entities.keys()) {
      distances.set(entityId, Infinity);
      paths.set(entityId, []);
      pathCounts.set(entityId, 0);
    }
    distances.set(sourceId, 0);
    paths.set(sourceId, [[sourceId]]);
    pathCounts.set(sourceId, 1);

    while (queue.length > 0) {
      queue.sort((a, b) => a[1] - b[1]);
      const [current, currentDistance] = queue.shift();

      if (visited.has(current)) continue;
      visited.add(current);

      const currentPaths = paths.get(current);
      const neighbors = this.adjacencyList.get(current) || [];

      for (const neighbor of neighbors) {
        const weight = this._getEdgeWeight(current, neighbor);
        const distance = currentDistance + weight;

        if (distance < distances.get(neighbor)) {
          distances.set(neighbor, distance);
          paths.set(neighbor, currentPaths.map(p => [...p, neighbor]));
          pathCounts.set(neighbor, currentPaths.length);
          queue.push([neighbor, distance]);
        } else if (distance === distances.get(neighbor)) {
          const neighborPaths = paths.get(neighbor);
          neighborPaths.push(...currentPaths.map(p => [...p, neighbor]));
          pathCounts.set(neighbor, pathCounts.get(neighbor) + currentPaths.length);
        }
      }
    }

    return { distances, paths, pathCounts };
  }

  _astarPath(sourceId, targetId, options = {}) {
    const { heuristic = () => 1 } = options;

    const gScore = new Map();
    const fScore = new Map();
    const previous = new Map();
    const visited = new Set();
    const queue = [[sourceId, 0]];

    for (const entityId of this.entities.keys()) {
      gScore.set(entityId, Infinity);
      fScore.set(entityId, Infinity);
    }
    gScore.set(sourceId, 0);
    fScore.set(sourceId, heuristic(sourceId, targetId));

    while (queue.length > 0) {
      queue.sort((a, b) => fScore.get(a[0]) - fScore.get(b[0]));
      const [current] = queue.shift();

      if (current === targetId) {
        return this._reconstructPath(previous, sourceId, targetId, gScore.get(targetId));
      }

      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;

        const weight = this._getEdgeWeight(current, neighbor);
        const tentativeGScore = gScore.get(current) + weight;

        if (tentativeGScore < gScore.get(neighbor)) {
          previous.set(neighbor, current);
          gScore.set(neighbor, tentativeGScore);
          fScore.set(neighbor, tentativeGScore + heuristic(neighbor, targetId));
          queue.push([neighbor, fScore.get(neighbor)]);
        }
      }
    }

    return { path: [], distance: Infinity, found: false };
  }

  _bfsPath(sourceId, targetId, options = {}) {
    const visited = new Set();
    const previous = new Map();
    const queue = [sourceId];

    visited.add(sourceId);

    while (queue.length > 0) {
      const current = queue.shift();

      if (current === targetId) {
        return this._reconstructPath(previous, sourceId, targetId, null);
      }

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          previous.set(neighbor, current);
          queue.push(neighbor);
        }
      }
    }

    return { path: [], distance: null, found: false };
  }

  _dfsPath(sourceId, targetId, options = {}) {
    const visited = new Set();
    const previous = new Map();
    const stack = [sourceId];

    while (stack.length > 0) {
      const current = stack.pop();

      if (current === targetId) {
        return this._reconstructPath(previous, sourceId, targetId, null);
      }

      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          previous.set(neighbor, current);
          stack.push(neighbor);
        }
      }
    }

    return { path: [], distance: null, found: false };
  }

  _reconstructPath(previous, sourceId, targetId, distance) {
    const path = [];
    let current = targetId;

    if (!previous.has(current) && current !== sourceId) {
      return { path: [], distance, found: false };
    }

    while (current !== undefined) {
      path.unshift(current);
      current = previous.get(current);
    }

    return {
      path,
      distance,
      found: path[0] === sourceId && path[path.length - 1] === targetId
    };
  }

  _singleSourceShortestPaths(sourceId, edges = null) {
    const useEdges = edges || new Set(this.relationships.keys());
    const distances = new Map();
    const previous = new Map();
    const queue = [[sourceId, 0]];

    for (const entityId of this.entities.keys()) {
      distances.set(entityId, Infinity);
    }
    distances.set(sourceId, 0);

    while (queue.length > 0) {
      queue.sort((a, b) => a[1] - b[1]);
      const [current, currentDistance] = queue.shift();

      const neighbors = this.adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        const edge = this._findEdgeBetween(current, neighbor);
        if (!edge || (edges && !useEdges.has(edge))) continue;

        const distance = currentDistance + 1;
        if (distance < distances.get(neighbor)) {
          distances.set(neighbor, distance);
          previous.set(neighbor, current);
          queue.push([neighbor, distance]);
        }
      }
    }

    // Reconstruct paths
    const paths = new Map();
    for (const target of this.entities.keys()) {
      if (distances.get(target) < Infinity) {
        const path = [];
        let current = target;
        while (current !== undefined) {
          path.unshift(current);
          current = previous.get(current);
        }
        paths.set(target, path);
      }
    }

    return paths;
  }

  _getEdgeWeight(sourceId, targetId) {
    // Default weight is 1, can be customized based on relationship type
    const edge = this._findEdgeBetween(sourceId, targetId);
    if (!edge) return Infinity;

    const relationship = this.relationships.get(edge);
    return relationship?.weight || 1;
  }

  _findEdgeBetween(sourceId, targetId) {
    for (const [relId, rel] of this.relationships) {
      const sourceEntityId = this.entityIndex.get(rel.subject);
      const targetEntityId = this.entityIndex.get(rel.object);

      if (sourceEntityId === sourceId && targetEntityId === targetId) {
        return relId;
      }
    }
    return null;
  }

  // ==========================================================================
  // 8. GRAPH EMBEDDINGS
  // ==========================================================================

  async generateEmbeddings(method = 'node2vec', options = {}) {
    if (!this.config.enableEmbeddings) {
      throw new Error('Embeddings are disabled in config');
    }

    const methods = {
      node2vec: () => this._node2vecEmbeddings(options),
      deepwalk: () => this._deepwalkEmbeddings(options),
      graphsage: () => this._graphSageEmbeddings(options),
      gat: () => this._gatEmbeddings(options),
      transe: () => this._transEEmbeddings(options)
    };

    if (!methods[method]) {
      throw new Error(`Unknown embedding method: ${method}`);
    }

    await methods[method]();

    return {
      method,
      dimension: this.config.embeddingDim,
      entities: this.entityEmbeddings.size,
      relationships: this.relationEmbeddings.size
    };
  }

  async _node2vecEmbeddings(options = {}) {
    const {
      walkLength = 80,
      numWalks = 10,
      p = 1,
      q = 1,
      windowSize = 10,
      embeddingDim = this.config.embeddingDim
    } = options;

    // Generate random walks
    const walks = [];
    for (const entityId of this.entities.keys()) {
      for (let i = 0; i < numWalks; i++) {
        const walk = this._biasedRandomWalk(entityId, walkLength, p, q);
        walks.push(walk);
      }
    }

    // Train skip-gram model
    await this._trainSkipGram(walks, embeddingDim, windowSize);
  }

  _biasedRandomWalk(startId, length, p, q) {
    const walk = [startId];

    for (let i = 1; i < length; i++) {
      const current = walk[walk.length - 1];
      const neighbors = this.adjacencyList.get(current) || [];

      if (neighbors.length === 0) break;

      let next;
      if (walk.length === 1) {
        next = neighbors[Math.floor(Math.random() * neighbors.length)];
      } else {
        const previous = walk[walk.length - 2];
        next = this._biasedChoice(current, previous, neighbors, p, q);
      }

      walk.push(next);
    }

    return walk;
  }

  _biasedChoice(current, previous, neighbors, p, q) {
    const weights = [];

    for (const neighbor of neighbors) {
      let weight;
      if (neighbor === previous) {
        weight = 1 / p;
      } else if ((this.adjacencyList.get(previous) || []).includes(neighbor)) {
        weight = 1;
      } else {
        weight = 1 / q;
      }
      weights.push(weight);
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < neighbors.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return neighbors[i];
      }
    }

    return neighbors[neighbors.length - 1];
  }

  async _trainSkipGram(walks, embeddingDim, windowSize) {
    // Build vocabulary
    const vocab = new Map();
    let vocabSize = 0;

    for (const walk of walks) {
      for (const node of walk) {
        if (!vocab.has(node)) {
          vocab.set(node, vocabSize++);
        }
      }
    }

    // Initialize embeddings randomly
    for (const [node, idx] of vocab) {
      const embedding = Array.from({ length: embeddingDim }, () =>
        Math.random() * 2 - 1
      );
      this.entityEmbeddings.set(node, embedding);
    }

    // Simple skip-gram training (simplified)
    const learningRate = 0.025;
    const epochs = 5;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const walk of walks) {
        for (let i = 0; i < walk.length; i++) {
          const center = walk[i];
          const centerEmb = this.entityEmbeddings.get(center);

          const start = Math.max(0, i - windowSize);
          const end = Math.min(walk.length, i + windowSize + 1);

          for (let j = start; j < end; j++) {
            if (i === j) continue;

            const context = walk[j];
            const contextEmb = this.entityEmbeddings.get(context);

            // Update embeddings (simplified gradient descent)
            for (let d = 0; d < embeddingDim; d++) {
              const grad = (centerEmb[d] - contextEmb[d]) * learningRate;
              centerEmb[d] -= grad;
              contextEmb[d] += grad;
            }
          }
        }
      }
    }
  }

  async _deepwalkEmbeddings(options = {}) {
    // DeepWalk is Node2Vec with p=1, q=1
    return this._node2vecEmbeddings({ ...options, p: 1, q: 1 });
  }

  async _graphSageEmbeddings(options = {}) {
    const {
      layers = 2,
      embeddingDim = this.config.embeddingDim,
      aggregator = 'mean',
      neighborSamples = 25
    } = options;

    // Initialize random features
    const features = new Map();
    for (const entityId of this.entities.keys()) {
      features.set(entityId, Array.from({ length: embeddingDim }, () =>
        Math.random() * 2 - 1
      ));
    }

    // Aggregate over layers
    for (let layer = 0; layer < layers; layer++) {
      const newFeatures = new Map();

      for (const entityId of this.entities.keys()) {
        const neighbors = this.adjacencyList.get(entityId) || [];
        const sampledNeighbors = this._sampleNeighbors(neighbors, neighborSamples);

        const aggregated = this._aggregateNeighbors(
          sampledNeighbors.map(n => features.get(n)),
          aggregator
        );

        const selfFeature = features.get(entityId);
        const combined = this._combineFeatures(selfFeature, aggregated);

        newFeatures.set(entityId, combined);
      }

      // Update features
      for (const [entityId, feature] of newFeatures) {
        features.set(entityId, feature);
      }
    }

    // Store embeddings
    for (const [entityId, feature] of features) {
      this.entityEmbeddings.set(entityId, feature);
    }
  }

  _sampleNeighbors(neighbors, k) {
    if (neighbors.length <= k) return neighbors;

    const sampled = [];
    const indices = new Set();

    while (sampled.length < k) {
      const idx = Math.floor(Math.random() * neighbors.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        sampled.push(neighbors[idx]);
      }
    }

    return sampled;
  }

  _aggregateNeighbors(neighborFeatures, aggregator) {
    if (neighborFeatures.length === 0) {
      return Array(this.config.embeddingDim).fill(0);
    }

    const dim = neighborFeatures[0].length;
    const aggregated = Array(dim).fill(0);

    switch (aggregator) {
      case 'mean':
        for (const feature of neighborFeatures) {
          for (let i = 0; i < dim; i++) {
            aggregated[i] += feature[i];
          }
        }
        for (let i = 0; i < dim; i++) {
          aggregated[i] /= neighborFeatures.length;
        }
        break;

      case 'max':
        for (let i = 0; i < dim; i++) {
          aggregated[i] = Math.max(...neighborFeatures.map(f => f[i]));
        }
        break;

      case 'sum':
        for (const feature of neighborFeatures) {
          for (let i = 0; i < dim; i++) {
            aggregated[i] += feature[i];
          }
        }
        break;
    }

    return aggregated;
  }

  _combineFeatures(selfFeature, aggregated) {
    const combined = [];
    for (let i = 0; i < selfFeature.length; i++) {
      combined.push((selfFeature[i] + aggregated[i]) / 2);
    }
    return combined;
  }

  async _gatEmbeddings(options = {}) {
    // Graph Attention Networks (simplified)
    const {
      heads = 8,
      embeddingDim = this.config.embeddingDim,
      layers = 2
    } = options;

    // Initialize features
    const features = new Map();
    for (const entityId of this.entities.keys()) {
      features.set(entityId, Array.from({ length: embeddingDim }, () =>
        Math.random() * 2 - 1
      ));
    }

    // Multi-head attention over layers
    for (let layer = 0; layer < layers; layer++) {
      const newFeatures = new Map();

      for (const entityId of this.entities.keys()) {
        const neighbors = [entityId, ...(this.adjacencyList.get(entityId) || [])];

        // Attention mechanism
        const headOutputs = [];
        for (let head = 0; head < heads; head++) {
          const attended = this._attentionAggregation(
            entityId,
            neighbors,
            features
          );
          headOutputs.push(attended);
        }

        // Concatenate heads
        const concatenated = headOutputs.flat();
        newFeatures.set(entityId, concatenated.slice(0, embeddingDim));
      }

      // Update features
      for (const [entityId, feature] of newFeatures) {
        features.set(entityId, feature);
      }
    }

    // Store embeddings
    for (const [entityId, feature] of features) {
      this.entityEmbeddings.set(entityId, feature);
    }
  }

  _attentionAggregation(entityId, neighbors, features) {
    const selfFeature = features.get(entityId);
    const dim = selfFeature.length;

    // Compute attention scores
    const scores = [];
    for (const neighbor of neighbors) {
      const neighborFeature = features.get(neighbor);
      const score = this._dotProduct(selfFeature, neighborFeature);
      scores.push(score);
    }

    // Softmax
    const expScores = scores.map(s => Math.exp(s));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const attention = expScores.map(s => s / sumExp);

    // Weighted sum
    const output = Array(dim).fill(0);
    for (let i = 0; i < neighbors.length; i++) {
      const neighborFeature = features.get(neighbors[i]);
      for (let j = 0; j < dim; j++) {
        output[j] += attention[i] * neighborFeature[j];
      }
    }

    return output;
  }

  _dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  async _transEEmbeddings(options = {}) {
    // TransE for knowledge graph embeddings
    const {
      embeddingDim = this.config.embeddingDim,
      margin = 1.0,
      epochs = 100,
      learningRate = 0.01
    } = options;

    // Initialize embeddings
    for (const entityId of this.entities.keys()) {
      const embedding = Array.from({ length: embeddingDim }, () =>
        Math.random() * 2 - 1
      );
      this.entityEmbeddings.set(entityId, this._normalize(embedding));
    }

    const relationTypes = new Set();
    for (const rel of this.relationships.values()) {
      relationTypes.add(rel.predicate);
    }

    for (const relType of relationTypes) {
      const embedding = Array.from({ length: embeddingDim }, () =>
        Math.random() * 2 - 1
      );
      this.relationEmbeddings.set(relType, this._normalize(embedding));
    }

    // Training loop
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const rel of this.relationships.values()) {
        const subjectId = this.entityIndex.get(rel.subject);
        const objectId = this.entityIndex.get(rel.object);

        if (!subjectId || !objectId) continue;

        const h = this.entityEmbeddings.get(subjectId);
        const r = this.relationEmbeddings.get(rel.predicate);
        const t = this.entityEmbeddings.get(objectId);

        // Positive triple: h + r ≈ t
        const positive = this._l2Distance(
          this._add(h, r),
          t
        );

        // Negative triple (corrupt head or tail)
        const negativeEntityId = this._getRandomEntity();
        const hn = this.entityEmbeddings.get(negativeEntityId);
        const negative = this._l2Distance(
          this._add(hn, r),
          t
        );

        // Hinge loss: max(0, positive - negative + margin)
        const loss = Math.max(0, positive - negative + margin);

        if (loss > 0) {
          // Update embeddings
          const grad = this._subtract(this._add(h, r), t);

          for (let i = 0; i < embeddingDim; i++) {
            h[i] -= learningRate * grad[i];
            r[i] -= learningRate * grad[i];
            t[i] += learningRate * grad[i];
          }

          // Normalize
          this.entityEmbeddings.set(subjectId, this._normalize(h));
          this.relationEmbeddings.set(rel.predicate, this._normalize(r));
          this.entityEmbeddings.set(objectId, this._normalize(t));
        }
      }
    }
  }

  _normalize(vector) {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return norm === 0 ? vector : vector.map(val => val / norm);
  }

  _l2Distance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  _add(a, b) {
    return a.map((val, i) => val + b[i]);
  }

  _subtract(a, b) {
    return a.map((val, i) => val - b[i]);
  }

  _getRandomEntity() {
    const entities = Array.from(this.entities.keys());
    return entities[Math.floor(Math.random() * entities.length)];
  }

  // ==========================================================================
  // 9. TEMPORAL GRAPHS
  // ==========================================================================

  addTemporalEvent(event) {
    const { timestamp, subject, predicate, object, metadata = {} } = event;

    const relId = this.addRelationship(subject, predicate, object, {
      ...metadata,
      timestamp
    });

    // Index by timestamp
    if (!this.temporalIndex.has(timestamp)) {
      this.temporalIndex.set(timestamp, []);
    }
    this.temporalIndex.get(timestamp).push(relId);

    return relId;
  }

  getTemporalSnapshot(timestamp, options = {}) {
    const { window = 0 } = options;

    const startTime = timestamp - window;
    const endTime = timestamp + window;

    const snapshot = {
      timestamp,
      entities: new Map(),
      relationships: new Map()
    };

    // Collect all relationships in time window
    for (const [ts, relIds] of this.temporalIndex) {
      if (ts >= startTime && ts <= endTime) {
        for (const relId of relIds) {
          const rel = this.relationships.get(relId);
          if (rel) {
            snapshot.relationships.set(relId, rel);

            // Add involved entities
            const subjectId = this.entityIndex.get(rel.subject);
            const objectId = this.entityIndex.get(rel.object);

            if (subjectId && this.entities.has(subjectId)) {
              snapshot.entities.set(subjectId, this.entities.get(subjectId));
            }
            if (objectId && this.entities.has(objectId)) {
              snapshot.entities.set(objectId, this.entities.get(objectId));
            }
          }
        }
      }
    }

    return snapshot;
  }

  getTemporalEvolution(entityId, options = {}) {
    const { startTime = null, endTime = null } = options;

    const evolution = [];

    for (const [timestamp, relIds] of this.temporalIndex) {
      if (startTime && timestamp < startTime) continue;
      if (endTime && timestamp > endTime) continue;

      for (const relId of relIds) {
        const rel = this.relationships.get(relId);
        if (!rel) continue;

        const subjectId = this.entityIndex.get(rel.subject);
        const objectId = this.entityIndex.get(rel.object);

        if (subjectId === entityId || objectId === entityId) {
          evolution.push({
            timestamp,
            relationship: rel,
            role: subjectId === entityId ? 'subject' : 'object'
          });
        }
      }
    }

    evolution.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return evolution;
  }

  analyzeTemporalPatterns(options = {}) {
    const {
      minSupport = 0.1,
      maxGap = 3600000 // 1 hour in ms
    } = options;

    const patterns = [];
    const sequences = this._extractTemporalSequences(maxGap);

    // Find frequent sequences
    const sequenceCounts = new Map();
    for (const sequence of sequences) {
      const key = sequence.map(e => e.predicate).join('->');
      sequenceCounts.set(key, (sequenceCounts.get(key) || 0) + 1);
    }

    const minCount = sequences.length * minSupport;
    for (const [sequence, count] of sequenceCounts) {
      if (count >= minCount) {
        patterns.push({
          sequence: sequence.split('->'),
          support: count / sequences.length,
          count
        });
      }
    }

    return patterns.sort((a, b) => b.support - a.support);
  }

  _extractTemporalSequences(maxGap) {
    const sequences = [];
    const sortedEvents = [];

    // Collect all temporal events
    for (const [timestamp, relIds] of this.temporalIndex) {
      for (const relId of relIds) {
        const rel = this.relationships.get(relId);
        if (rel) {
          sortedEvents.push({
            timestamp,
            relation: rel
          });
        }
      }
    }

    sortedEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Extract sequences by entity
    const entitySequences = new Map();

    for (const event of sortedEvents) {
      const { timestamp, relation } = event;
      const subjectId = this.entityIndex.get(relation.subject);

      if (!entitySequences.has(subjectId)) {
        entitySequences.set(subjectId, []);
      }

      const sequence = entitySequences.get(subjectId);
      const lastEvent = sequence[sequence.length - 1];

      if (!lastEvent ||
          new Date(timestamp) - new Date(lastEvent.timestamp) <= maxGap) {
        sequence.push(event);
      } else {
        // Start new sequence
        if (sequence.length > 1) {
          sequences.push(sequence.map(e => e.relation));
        }
        entitySequences.set(subjectId, [event]);
      }
    }

    // Add remaining sequences
    for (const sequence of entitySequences.values()) {
      if (sequence.length > 1) {
        sequences.push(sequence.map(e => e.relation));
      }
    }

    return sequences;
  }

  // ==========================================================================
  // 10. MULTI-HOP REASONING
  // ==========================================================================

  multiHopQuery(query, options = {}) {
    const {
      maxHops = 3,
      beamSize = 5,
      scoreThreshold = 0.5
    } = options;

    const { subject, relations } = this._parseQuery(query);

    if (!subject || relations.length === 0) {
      throw new Error('Invalid query format');
    }

    return this._beamSearchReasoning(subject, relations, maxHops, beamSize, scoreThreshold);
  }

  _parseQuery(query) {
    // Parse query format: "subject -> relation1 -> relation2 -> ?"
    // Example: "Albert Einstein -> WORKS_AT -> LOCATED_IN -> ?"

    const parts = query.split('->').map(p => p.trim());

    return {
      subject: parts[0],
      relations: parts.slice(1, -1),
      variable: parts[parts.length - 1]
    };
  }

  _beamSearchReasoning(subject, relations, maxHops, beamSize, threshold) {
    // Initialize beam with starting entity
    const subjectId = this.entityIndex.get(subject);
    if (!subjectId) {
      return { answers: [], paths: [] };
    }

    let beam = [{
      entityId: subjectId,
      path: [subject],
      score: 1.0,
      hop: 0
    }];

    // Perform beam search
    for (const relation of relations) {
      const candidates = [];

      for (const state of beam) {
        if (state.hop >= maxHops) continue;

        // Find all relationships with this predicate from current entity
        const nextStates = this._expandState(state, relation);
        candidates.push(...nextStates);
      }

      // Keep top-k candidates
      candidates.sort((a, b) => b.score - a.score);
      beam = candidates.slice(0, beamSize);

      // Filter by threshold
      beam = beam.filter(state => state.score >= threshold);

      if (beam.length === 0) break;
    }

    // Extract answers
    const answers = beam.map(state => ({
      entity: this.entities.get(state.entityId)?.name || state.entityId,
      score: state.score,
      path: state.path,
      hops: state.hop
    }));

    return {
      answers,
      totalPaths: beam.length
    };
  }

  _expandState(state, relation) {
    const nextStates = [];
    const currentEntity = this.entities.get(state.entityId);
    if (!currentEntity) return nextStates;

    // Find relationships with matching predicate
    for (const rel of this.relationships.values()) {
      if (rel.predicate !== relation) continue;

      const subjectId = this.entityIndex.get(rel.subject);
      if (subjectId !== state.entityId) continue;

      const objectId = this.entityIndex.get(rel.object);
      if (!objectId) continue;

      // Avoid cycles
      if (state.path.includes(rel.object)) continue;

      // Calculate score based on relationship confidence
      const score = state.score * (rel.confidence || 0.8);

      nextStates.push({
        entityId: objectId,
        path: [...state.path, rel.object],
        score,
        hop: state.hop + 1
      });
    }

    return nextStates;
  }

  inferMissingLinks(options = {}) {
    const {
      method = 'embedding',
      threshold = 0.7,
      maxPredictions = 100
    } = options;

    const predictions = [];

    if (method === 'embedding' && this.entityEmbeddings.size > 0) {
      predictions.push(...this._embeddingBasedInference(threshold, maxPredictions));
    } else if (method === 'path') {
      predictions.push(...this._pathBasedInference(threshold, maxPredictions));
    } else if (method === 'rule') {
      predictions.push(...this._ruleBasedInference(threshold, maxPredictions));
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  _embeddingBasedInference(threshold, maxPredictions) {
    const predictions = [];

    // For each entity pair without a relationship
    const entities = Array.from(this.entities.keys());

    for (let i = 0; i < entities.length && predictions.length < maxPredictions; i++) {
      for (let j = i + 1; j < entities.length && predictions.length < maxPredictions; j++) {
        const e1 = entities[i];
        const e2 = entities[j];

        // Skip if relationship already exists
        if (this._hasRelationship(e1, e2)) continue;

        const emb1 = this.entityEmbeddings.get(e1);
        const emb2 = this.entityEmbeddings.get(e2);

        if (!emb1 || !emb2) continue;

        // Calculate similarity
        const similarity = this._cosineSimilarity(emb1, emb2);

        if (similarity >= threshold) {
          // Predict most likely relation type
          const relationType = this._predictRelationType(e1, e2, emb1, emb2);

          predictions.push({
            subject: this.entities.get(e1)?.name || e1,
            predicate: relationType,
            object: this.entities.get(e2)?.name || e2,
            confidence: similarity,
            method: 'embedding'
          });
        }
      }
    }

    return predictions;
  }

  _pathBasedInference(threshold, maxPredictions) {
    const predictions = [];
    const entities = Array.from(this.entities.keys());

    // Find paths between entity pairs
    for (let i = 0; i < entities.length && predictions.length < maxPredictions; i++) {
      for (let j = i + 1; j < entities.length && predictions.length < maxPredictions; j++) {
        const e1 = entities[i];
        const e2 = entities[j];

        if (this._hasRelationship(e1, e2)) continue;

        // Find paths of length 2 (e1 -> x -> e2)
        const paths = this._findPathsOfLength(e1, e2, 2);

        if (paths.length > 0) {
          // Infer relation based on path patterns
          const confidence = Math.min(0.9, paths.length / 10);

          if (confidence >= threshold) {
            const relationType = this._inferRelationFromPaths(paths);

            predictions.push({
              subject: this.entities.get(e1)?.name || e1,
              predicate: relationType,
              object: this.entities.get(e2)?.name || e2,
              confidence,
              method: 'path',
              supportingPaths: paths.length
            });
          }
        }
      }
    }

    return predictions;
  }

  _ruleBasedInference(threshold, maxPredictions) {
    const predictions = [];

    // Learn rules from existing relationships
    const rules = this._mineAssociationRules();

    // Apply rules to infer new relationships
    for (const rule of rules) {
      if (predictions.length >= maxPredictions) break;
      if (rule.confidence < threshold) continue;

      const newRels = this._applyRule(rule);
      predictions.push(...newRels);
    }

    return predictions;
  }

  _findPathsOfLength(sourceId, targetId, length) {
    if (length === 0) {
      return sourceId === targetId ? [[sourceId]] : [];
    }

    if (length === 1) {
      return this._hasRelationship(sourceId, targetId)
        ? [[sourceId, targetId]]
        : [];
    }

    const paths = [];
    const neighbors = this.adjacencyList.get(sourceId) || [];

    for (const neighbor of neighbors) {
      const subPaths = this._findPathsOfLength(neighbor, targetId, length - 1);
      for (const subPath of subPaths) {
        paths.push([sourceId, ...subPath]);
      }
    }

    return paths;
  }

  _inferRelationFromPaths(paths) {
    // Analyze path patterns to infer relation type
    const relationSequences = new Map();

    for (const path of paths) {
      const rels = [];
      for (let i = 0; i < path.length - 1; i++) {
        const rel = this._getRelationBetween(path[i], path[i + 1]);
        if (rel) rels.push(rel.predicate);
      }

      const key = rels.join('->');
      relationSequences.set(key, (relationSequences.get(key) || 0) + 1);
    }

    // Find most common sequence
    let maxCount = 0;
    let mostCommon = 'RELATED_TO';

    for (const [sequence, count] of relationSequences) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = sequence;
      }
    }

    return mostCommon;
  }

  _mineAssociationRules() {
    // Mine association rules: (r1, r2) -> r3
    const rules = [];
    const relationPairs = new Map();

    // Find entity pairs with multiple relationships
    for (const e1 of this.entities.keys()) {
      for (const e2 of this.entities.keys()) {
        if (e1 === e2) continue;

        const rels = this._getAllRelationsBetween(e1, e2);
        if (rels.length >= 2) {
          for (let i = 0; i < rels.length; i++) {
            for (let j = i + 1; j < rels.length; j++) {
              const key = `${rels[i].predicate},${rels[j].predicate}`;
              if (!relationPairs.has(key)) {
                relationPairs.set(key, []);
              }
              relationPairs.get(key).push({ e1, e2, rels });
            }
          }
        }
      }
    }

    // TODO: Implement full rule mining
    return rules;
  }

  _applyRule(rule) {
    const predictions = [];
    // TODO: Implement rule application
    return predictions;
  }

  _cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  _predictRelationType(e1, e2, emb1, emb2) {
    // Find most similar existing relationship
    let maxSimilarity = 0;
    let bestRelation = 'RELATED_TO';

    for (const [relType, relEmb] of this.relationEmbeddings) {
      const predictedEmb = this._add(emb1, relEmb);
      const similarity = this._cosineSimilarity(predictedEmb, emb2);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestRelation = relType;
      }
    }

    return bestRelation;
  }

  // ==========================================================================
  // VISUAL GRAPH EXPORT
  // ==========================================================================

  exportGraph(format = 'json', options = {}) {
    const formats = {
      json: () => this._exportJSON(options),
      cytoscape: () => this._exportCytoscape(options),
      graphml: () => this._exportGraphML(options),
      gexf: () => this._exportGEXF(options),
      dot: () => this._exportDOT(options),
      d3: () => this._exportD3(options)
    };

    if (!formats[format]) {
      throw new Error(`Unknown export format: ${format}`);
    }

    return formats[format]();
  }

  _exportJSON(options = {}) {
    const { includeEmbeddings = false } = options;

    const data = {
      entities: [],
      relationships: [],
      ontology: this.ontology.export(),
      stats: this.stats
    };

    for (const [id, entity] of this.entities) {
      const entityData = {
        id,
        ...entity
      };

      if (includeEmbeddings && this.entityEmbeddings.has(id)) {
        entityData.embedding = this.entityEmbeddings.get(id);
      }

      data.entities.push(entityData);
    }

    for (const [id, rel] of this.relationships) {
      data.relationships.push({
        id,
        ...rel
      });
    }

    return JSON.stringify(data, null, 2);
  }

  _exportCytoscape(options = {}) {
    const elements = {
      nodes: [],
      edges: []
    };

    for (const [id, entity] of this.entities) {
      elements.nodes.push({
        data: {
          id,
          label: entity.name || id,
          ...entity
        }
      });
    }

    for (const [id, rel] of this.relationships) {
      const sourceId = this.entityIndex.get(rel.subject);
      const targetId = this.entityIndex.get(rel.object);

      if (sourceId && targetId) {
        elements.edges.push({
          data: {
            id,
            source: sourceId,
            target: targetId,
            label: rel.predicate,
            ...rel.metadata
          }
        });
      }
    }

    return JSON.stringify(elements, null, 2);
  }

  _exportGraphML(options = {}) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    xml += '  <graph id="G" edgedefault="directed">\n';

    // Nodes
    for (const [id, entity] of this.entities) {
      xml += `    <node id="${this._escapeXML(id)}">\n`;
      xml += `      <data key="name">${this._escapeXML(entity.name || id)}</data>\n`;
      if (entity.type) {
        xml += `      <data key="type">${this._escapeXML(entity.type)}</data>\n`;
      }
      xml += '    </node>\n';
    }

    // Edges
    for (const [id, rel] of this.relationships) {
      const sourceId = this.entityIndex.get(rel.subject);
      const targetId = this.entityIndex.get(rel.object);

      if (sourceId && targetId) {
        xml += `    <edge id="${this._escapeXML(id)}" `;
        xml += `source="${this._escapeXML(sourceId)}" `;
        xml += `target="${this._escapeXML(targetId)}">\n`;
        xml += `      <data key="label">${this._escapeXML(rel.predicate)}</data>\n`;
        xml += '    </edge>\n';
      }
    }

    xml += '  </graph>\n';
    xml += '</graphml>';

    return xml;
  }

  _exportGEXF(options = {}) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">\n';
    xml += '  <graph mode="static" defaultedgetype="directed">\n';
    xml += '    <nodes>\n';

    for (const [id, entity] of this.entities) {
      xml += `      <node id="${this._escapeXML(id)}" label="${this._escapeXML(entity.name || id)}" />\n`;
    }

    xml += '    </nodes>\n';
    xml += '    <edges>\n';

    let edgeId = 0;
    for (const [id, rel] of this.relationships) {
      const sourceId = this.entityIndex.get(rel.subject);
      const targetId = this.entityIndex.get(rel.object);

      if (sourceId && targetId) {
        xml += `      <edge id="${edgeId++}" `;
        xml += `source="${this._escapeXML(sourceId)}" `;
        xml += `target="${this._escapeXML(targetId)}" `;
        xml += `label="${this._escapeXML(rel.predicate)}" />\n`;
      }
    }

    xml += '    </edges>\n';
    xml += '  </graph>\n';
    xml += '</gexf>';

    return xml;
  }

  _exportDOT(options = {}) {
    let dot = 'digraph KnowledgeGraph {\n';
    dot += '  node [shape=box];\n';

    // Nodes
    for (const [id, entity] of this.entities) {
      const label = entity.name || id;
      dot += `  "${id}" [label="${this._escapeDOT(label)}"];\n`;
    }

    // Edges
    for (const [id, rel] of this.relationships) {
      const sourceId = this.entityIndex.get(rel.subject);
      const targetId = this.entityIndex.get(rel.object);

      if (sourceId && targetId) {
        dot += `  "${sourceId}" -> "${targetId}" [label="${this._escapeDOT(rel.predicate)}"];\n`;
      }
    }

    dot += '}';
    return dot;
  }

  _exportD3(options = {}) {
    const data = {
      nodes: [],
      links: []
    };

    for (const [id, entity] of this.entities) {
      data.nodes.push({
        id,
        name: entity.name || id,
        type: entity.type,
        ...entity
      });
    }

    for (const [id, rel] of this.relationships) {
      const sourceId = this.entityIndex.get(rel.subject);
      const targetId = this.entityIndex.get(rel.object);

      if (sourceId && targetId) {
        data.links.push({
          source: sourceId,
          target: targetId,
          type: rel.predicate,
          ...rel.metadata
        });
      }
    }

    return JSON.stringify(data, null, 2);
  }

  _escapeXML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  _escapeDOT(str) {
    return String(str).replace(/"/g, '\\"');
  }

  // ==========================================================================
  // CORE GRAPH OPERATIONS
  // ==========================================================================

  addEntity(entity) {
    const id = entity.id || this._generateId('entity');
    const name = entity.text || entity.name || id;

    const entityData = {
      id,
      name,
      type: entity.type || 'THING',
      confidence: entity.confidence || 1.0,
      metadata: entity.metadata || {},
      createdAt: new Date().toISOString()
    };

    this.entities.set(id, entityData);
    this.entityIndex.set(name, id);

    // Initialize adjacency lists
    if (!this.adjacencyList.has(id)) {
      this.adjacencyList.set(id, []);
    }
    if (!this.reverseAdjacencyList.has(id)) {
      this.reverseAdjacencyList.set(id, []);
    }

    this.stats.entitiesCount++;

    return id;
  }

  addRelationship(subject, predicate, object, metadata = {}) {
    const id = this._generateId('rel');

    // Ensure entities exist
    let subjectId = this.entityIndex.get(subject);
    if (!subjectId) {
      subjectId = this.addEntity({ name: subject });
    }

    let objectId = this.entityIndex.get(object);
    if (!objectId) {
      objectId = this.addEntity({ name: object });
    }

    const relationship = {
      id,
      subject,
      predicate,
      object,
      confidence: metadata.confidence || 0.8,
      metadata,
      createdAt: new Date().toISOString()
    };

    this.relationships.set(id, relationship);
    this.triples.push([subject, predicate, object]);

    // Update indexes
    if (!this.relationshipIndex.has(predicate)) {
      this.relationshipIndex.set(predicate, []);
    }
    this.relationshipIndex.get(predicate).push(id);

    // Update adjacency lists
    if (!this.adjacencyList.get(subjectId).includes(objectId)) {
      this.adjacencyList.get(subjectId).push(objectId);
    }
    if (!this.reverseAdjacencyList.get(objectId).includes(subjectId)) {
      this.reverseAdjacencyList.get(objectId).push(subjectId);
    }

    this.stats.relationshipsCount++;

    return id;
  }

  getEntity(id) {
    return this.entities.get(id);
  }

  getRelationship(id) {
    return this.relationships.get(id);
  }

  _generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _getEntityType(entityIdentifier) {
    const entityId = this.entityIndex.get(entityIdentifier);
    if (!entityId) return 'THING';

    const entity = this.entities.get(entityId);
    return entity?.type || 'THING';
  }

  _getRelationshipsByType(type) {
    return (this.relationshipIndex.get(type) || [])
      .map(id => this.relationships.get(id))
      .filter(Boolean);
  }

  _hasRelationship(entity1, entity2) {
    for (const rel of this.relationships.values()) {
      const subjectId = this.entityIndex.get(rel.subject);
      const objectId = this.entityIndex.get(rel.object);

      if ((subjectId === entity1 && objectId === entity2) ||
          (subjectId === entity2 && objectId === entity1)) {
        return rel;
      }
    }
    return null;
  }

  _getRelationBetween(entity1, entity2) {
    for (const rel of this.relationships.values()) {
      const subjectId = this.entityIndex.get(rel.subject);
      const objectId = this.entityIndex.get(rel.object);

      if (subjectId === entity1 && objectId === entity2) {
        return rel;
      }
    }
    return null;
  }

  _getAllRelationsBetween(entity1, entity2) {
    const rels = [];
    for (const rel of this.relationships.values()) {
      const subjectId = this.entityIndex.get(rel.subject);
      const objectId = this.entityIndex.get(rel.object);

      if ((subjectId === entity1 && objectId === entity2) ||
          (subjectId === entity2 && objectId === entity1)) {
        rels.push(rel);
      }
    }
    return rels;
  }

  _isFunctional(relationships, minConfidence) {
    // Check if each subject has at most one object
    const subjectToObjects = new Map();

    for (const rel of relationships) {
      const subject = rel.subject;
      if (!subjectToObjects.has(subject)) {
        subjectToObjects.set(subject, new Set());
      }
      subjectToObjects.get(subject).add(rel.object);
    }

    const functionalCount = Array.from(subjectToObjects.values())
      .filter(objects => objects.size === 1).length;

    return functionalCount / subjectToObjects.size >= minConfidence;
  }

  _isInverseFunctional(relationships, minConfidence) {
    // Check if each object has at most one subject
    const objectToSubjects = new Map();

    for (const rel of relationships) {
      const object = rel.object;
      if (!objectToSubjects.has(object)) {
        objectToSubjects.set(object, new Set());
      }
      objectToSubjects.get(object).add(rel.subject);
    }

    const inverseFunctionalCount = Array.from(objectToSubjects.values())
      .filter(subjects => subjects.size === 1).length;

    return inverseFunctionalCount / objectToSubjects.size >= minConfidence;
  }

  _isTransitive(relationships, minConfidence) {
    // Check if (a,p,b) ∧ (b,p,c) → (a,p,c) holds
    let transitiveCount = 0;
    let totalChecks = 0;

    for (const rel1 of relationships) {
      for (const rel2 of relationships) {
        if (rel1.object === rel2.subject) {
          totalChecks++;
          // Check if there's a direct relationship from rel1.subject to rel2.object
          const direct = relationships.find(r =>
            r.subject === rel1.subject && r.object === rel2.object
          );
          if (direct) transitiveCount++;
        }
      }
    }

    return totalChecks > 0 && transitiveCount / totalChecks >= minConfidence;
  }

  _isSymmetric(relationships, minConfidence) {
    // Check if (a,p,b) → (b,p,a) holds
    let symmetricCount = 0;

    for (const rel1 of relationships) {
      const reverse = relationships.find(rel2 =>
        rel2.subject === rel1.object && rel2.object === rel1.subject
      );
      if (reverse) symmetricCount++;
    }

    return symmetricCount / relationships.length >= minConfidence;
  }

  _areSetsEqual(set1, set2) {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }

  _updateStatistics() {
    const n = this.entities.size;
    const m = this.relationships.size;

    this.stats.entitiesCount = n;
    this.stats.relationshipsCount = m;

    if (n > 0) {
      let totalDegree = 0;
      for (const neighbors of this.adjacencyList.values()) {
        totalDegree += neighbors.length;
      }
      this.stats.avgDegree = totalDegree / n;

      const maxEdges = n * (n - 1);
      this.stats.density = maxEdges > 0 ? m / maxEdges : 0;
    }
  }

  getStatistics() {
    this._updateStatistics();
    return {
      ...this.stats,
      communities: this.communityCache?.communities?.length || 0,
      hasEmbeddings: this.entityEmbeddings.size > 0,
      temporalEvents: this.temporalIndex.size
    };
  }
}

// ============================================================================
// ONTOLOGY MANAGER
// ============================================================================

class OntologyManager {
  constructor() {
    this.hierarchy = null;
    this.properties = new Map();
    this.axioms = [];
  }

  updateHierarchy(hierarchy) {
    this.hierarchy = hierarchy;
  }

  updateProperties(properties) {
    this.properties = properties;
  }

  updateAxioms(axioms) {
    this.axioms = axioms;
  }

  getStats() {
    return {
      classes: this._countClasses(this.hierarchy),
      properties: this.properties.size,
      axioms: this.axioms.length
    };
  }

  _countClasses(node) {
    if (!node) return 0;
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this._countClasses(child);
      }
    }
    return count;
  }

  export() {
    return {
      hierarchy: this.hierarchy,
      properties: Array.from(this.properties.entries()).map(([k, v]) => ({
        name: k,
        ...v,
        domain: Array.from(v.domain.entries()),
        range: Array.from(v.range.entries())
      })),
      axioms: this.axioms
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default KnowledgeGraph;

export {
  KnowledgeGraph,
  OntologyManager
};
