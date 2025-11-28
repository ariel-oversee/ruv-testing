/**
 * AI Knowledge Nexus - Comprehensive API Layer
 *
 * Features:
 * - RESTful API with full CRUD operations
 * - GraphQL API with subscriptions
 * - WebSocket real-time updates
 * - JWT authentication and authorization
 * - Rate limiting and throttling
 * - API versioning (v1, v2)
 * - Request validation
 * - Response caching
 * - OpenAPI/Swagger documentation
 * - SDK generation support
 * - Batch operations
 * - Streaming responses
 *
 * @module nexus-api
 * @version 2.0.0
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const WebSocket = require('ws');

// ============================================================================
// CORE API SERVER
// ============================================================================

/**
 * Main API Server Class
 */
class NexusAPIServer extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      port: options.port || 3000,
      host: options.host || '0.0.0.0',
      ssl: options.ssl || false,
      cors: options.cors !== false,
      apiVersion: options.apiVersion || 'v1',
      rateLimit: options.rateLimit || { windowMs: 60000, max: 100 },
      jwtSecret: options.jwtSecret || crypto.randomBytes(32).toString('hex'),
      cacheEnabled: options.cacheEnabled !== false,
      cacheTTL: options.cacheTTL || 300,
      wsEnabled: options.wsEnabled !== false,
      graphqlEnabled: options.graphqlEnabled !== false,
      ...options
    };

    // Core services
    this.vectorEngine = options.vectorEngine;
    this.searchEngine = options.searchEngine;
    this.knowledgeGraph = options.knowledgeGraph;

    // Middleware components
    this.auth = new AuthenticationManager(this.options.jwtSecret);
    this.rateLimit = new RateLimiter(this.options.rateLimit);
    this.cache = new ResponseCache(this.options.cacheTTL);
    this.validator = new RequestValidator();
    this.metrics = new MetricsCollector();

    // API versioning
    this.versions = {
      v1: new APIv1Handler(this),
      v2: new APIv2Handler(this)
    };

    // WebSocket manager
    this.wsManager = null;
    if (this.options.wsEnabled) {
      this.wsManager = new WebSocketManager(this);
    }

    // GraphQL setup
    this.graphql = null;
    if (this.options.graphqlEnabled) {
      this.graphql = new GraphQLAPI(this);
    }

    // Route registry
    this.routes = new Map();
    this.registerRoutes();

    // Server instances
    this.server = null;
    this.isRunning = false;
  }

  /**
   * Start the API server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP/HTTPS server
        this.server = this.options.ssl
          ? https.createServer(this.options.ssl, this.handleRequest.bind(this))
          : http.createServer(this.handleRequest.bind(this));

        // Setup WebSocket server
        if (this.wsManager) {
          this.wsManager.attach(this.server);
        }

        // Start listening
        this.server.listen(this.options.port, this.options.host, () => {
          this.isRunning = true;
          this.emit('started', {
            port: this.options.port,
            host: this.options.host,
            version: this.options.apiVersion
          });
          console.log(`✓ Nexus API Server started on ${this.options.host}:${this.options.port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        this.isRunning = false;
        this.emit('stopped');
        console.log('✓ Nexus API Server stopped');
        resolve();
      });
    });
  }

  /**
   * Main request handler
   */
  async handleRequest(req, res) {
    const startTime = Date.now();
    const requestId = crypto.randomBytes(16).toString('hex');

    // Add request metadata
    req.id = requestId;
    req.startTime = startTime;

    try {
      // CORS headers
      if (this.options.cors) {
        this.setCORSHeaders(res);
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }
      }

      // Parse URL
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      req.pathname = parsedUrl.pathname;
      req.query = Object.fromEntries(parsedUrl.searchParams);

      // Rate limiting
      const rateLimitResult = await this.rateLimit.check(req);
      if (!rateLimitResult.allowed) {
        this.sendError(res, 429, 'Too Many Requests', {
          retryAfter: rateLimitResult.retryAfter
        });
        return;
      }

      // Parse request body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        req.body = await this.parseBody(req);
      }

      // Route request
      const response = await this.routeRequest(req, res);

      // Send response
      if (response && !res.headersSent) {
        this.sendResponse(res, response.statusCode || 200, response.data, response.headers);
      }

      // Collect metrics
      const duration = Date.now() - startTime;
      this.metrics.record('request', {
        method: req.method,
        path: req.pathname,
        statusCode: res.statusCode,
        duration
      });

    } catch (error) {
      console.error('Request error:', error);
      if (!res.headersSent) {
        this.sendError(res, 500, 'Internal Server Error', {
          requestId,
          error: error.message
        });
      }
    }
  }

  /**
   * Route incoming requests
   */
  async routeRequest(req, res) {
    const { pathname, method } = req;

    // Health check endpoint
    if (pathname === '/health') {
      return {
        statusCode: 200,
        data: {
          status: 'healthy',
          version: this.options.apiVersion,
          uptime: process.uptime(),
          timestamp: Date.now()
        }
      };
    }

    // Metrics endpoint
    if (pathname === '/metrics') {
      const token = this.extractToken(req);
      if (!token || !await this.auth.verify(token)) {
        return this.sendError(res, 401, 'Unauthorized');
      }
      return {
        statusCode: 200,
        data: this.metrics.getAll()
      };
    }

    // GraphQL endpoint
    if (this.graphql && pathname.startsWith('/graphql')) {
      return await this.graphql.handle(req, res);
    }

    // OpenAPI/Swagger documentation
    if (pathname === '/api-docs' || pathname === '/swagger.json') {
      return {
        statusCode: 200,
        data: this.generateOpenAPISpec()
      };
    }

    // API versioned routes
    const versionMatch = pathname.match(/^\/(v\d+)\//);
    const version = versionMatch ? versionMatch[1] : this.options.apiVersion;

    if (!this.versions[version]) {
      return this.sendError(res, 404, 'API version not found');
    }

    // Delegate to version handler
    return await this.versions[version].handle(req, res);
  }

  /**
   * Register API routes
   */
  registerRoutes() {
    // Routes are registered in version-specific handlers
    this.emit('routesRegistered');
  }

  /**
   * Parse request body
   */
  async parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString();
        // Prevent memory attacks
        if (body.length > 10e6) {
          req.connection.destroy();
          reject(new Error('Request entity too large'));
        }
      });

      req.on('end', () => {
        try {
          const contentType = req.headers['content-type'] || '';

          if (contentType.includes('application/json')) {
            resolve(JSON.parse(body));
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            resolve(Object.fromEntries(new URLSearchParams(body)));
          } else {
            resolve(body);
          }
        } catch (error) {
          reject(error);
        }
      });

      req.on('error', reject);
    });
  }

  /**
   * Extract JWT token from request
   */
  extractToken(req) {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    return match ? match[1] : null;
  }

  /**
   * Send JSON response
   */
  sendResponse(res, statusCode, data, headers = {}) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      ...headers
    });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * Send error response
   */
  sendError(res, statusCode, message, details = {}) {
    return this.sendResponse(res, statusCode, {
      error: true,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Set CORS headers
   */
  setCORSHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  /**
   * Generate OpenAPI specification
   */
  generateOpenAPISpec() {
    return {
      openapi: '3.0.0',
      info: {
        title: 'AI Knowledge Nexus API',
        version: '2.0.0',
        description: 'Comprehensive API for AI Knowledge Nexus - Vector database, search, and knowledge graph',
        contact: {
          name: 'API Support',
          email: 'api@nexus.ai'
        }
      },
      servers: [
        {
          url: `http://${this.options.host}:${this.options.port}`,
          description: 'Development server'
        }
      ],
      paths: this.generateOpenAPIPaths(),
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: this.generateOpenAPISchemas()
      }
    };
  }

  /**
   * Generate OpenAPI paths
   */
  generateOpenAPIPaths() {
    return {
      '/health': {
        get: {
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' }
                }
              }
            }
          }
        }
      },
      '/v1/auth/login': {
        post: {
          summary: 'Authenticate user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Authentication successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' }
                }
              }
            }
          }
        }
      },
      '/v1/vectors': {
        get: {
          summary: 'List vectors',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
          ],
          responses: {
            '200': {
              description: 'List of vectors',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/VectorListResponse' }
                }
              }
            }
          }
        },
        post: {
          summary: 'Insert vector',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VectorInsertRequest' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Vector inserted',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/VectorResponse' }
                }
              }
            }
          }
        }
      },
      '/v1/vectors/{id}': {
        get: {
          summary: 'Get vector by ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': {
              description: 'Vector found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/VectorResponse' }
                }
              }
            }
          }
        },
        put: {
          summary: 'Update vector',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VectorUpdateRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Vector updated'
            }
          }
        },
        delete: {
          summary: 'Delete vector',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '204': {
              description: 'Vector deleted'
            }
          }
        }
      },
      '/v1/vectors/search': {
        post: {
          summary: 'Search vectors',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VectorSearchRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchResponse' }
                }
              }
            }
          }
        }
      },
      '/v1/vectors/batch': {
        post: {
          summary: 'Batch insert vectors',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchInsertRequest' }
              }
            }
          },
          responses: {
            '201': {
              description: 'Vectors inserted',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/BatchResponse' }
                }
              }
            }
          }
        }
      },
      '/v1/search': {
        post: {
          summary: 'Advanced search',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdvancedSearchRequest' }
              }
            }
          },
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchResponse' }
                }
              }
            }
          }
        }
      },
      '/v1/analytics': {
        get: {
          summary: 'Get analytics',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Analytics data',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AnalyticsResponse' }
                }
              }
            }
          }
        }
      }
    };
  }

  /**
   * Generate OpenAPI schemas
   */
  generateOpenAPISchemas() {
    return {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          version: { type: 'string' },
          uptime: { type: 'number' },
          timestamp: { type: 'number' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          expiresIn: { type: 'number' },
          user: { type: 'object' }
        }
      },
      VectorInsertRequest: {
        type: 'object',
        required: ['vector'],
        properties: {
          id: { type: 'string' },
          vector: {
            type: 'array',
            items: { type: 'number' }
          },
          metadata: { type: 'object' }
        }
      },
      VectorResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          vector: {
            type: 'array',
            items: { type: 'number' }
          },
          metadata: { type: 'object' }
        }
      },
      VectorSearchRequest: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'array',
            items: { type: 'number' }
          },
          k: { type: 'integer', default: 10 },
          filters: { type: 'object' }
        }
      },
      SearchResponse: {
        type: 'object',
        properties: {
          results: { type: 'array' },
          total: { type: 'integer' },
          duration: { type: 'number' }
        }
      },
      BatchInsertRequest: {
        type: 'object',
        required: ['vectors'],
        properties: {
          vectors: {
            type: 'array',
            items: { $ref: '#/components/schemas/VectorInsertRequest' }
          }
        }
      },
      BatchResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          inserted: { type: 'integer' },
          failed: { type: 'integer' },
          results: { type: 'array' }
        }
      },
      AdvancedSearchRequest: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          fuzzy: { type: 'boolean' },
          semantic: { type: 'boolean' },
          filters: { type: 'object' },
          limit: { type: 'integer' }
        }
      },
      AnalyticsResponse: {
        type: 'object',
        properties: {
          requests: { type: 'object' },
          performance: { type: 'object' },
          errors: { type: 'object' }
        }
      }
    };
  }
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

/**
 * JWT-based authentication manager
 */
class AuthenticationManager {
  constructor(secret) {
    this.secret = secret;
    this.users = new Map();
    this.tokens = new Map();
    this.roles = new Map();

    // Default admin user (for demo - use database in production)
    this.addUser('admin', 'admin123', ['admin', 'user']);
  }

  /**
   * Add user
   */
  addUser(username, password, roles = ['user']) {
    const hash = this.hashPassword(password);
    this.users.set(username, {
      username,
      passwordHash: hash,
      roles,
      createdAt: Date.now()
    });
    this.roles.set(username, roles);
  }

  /**
   * Authenticate user
   */
  async authenticate(username, password) {
    const user = this.users.get(username);
    if (!user) {
      return null;
    }

    const hash = this.hashPassword(password);
    if (hash !== user.passwordHash) {
      return null;
    }

    // Generate JWT token
    const token = this.generateToken(username, user.roles);

    return {
      token,
      expiresIn: 3600,
      user: {
        username: user.username,
        roles: user.roles
      }
    };
  }

  /**
   * Generate JWT token (simplified - use jsonwebtoken in production)
   */
  generateToken(username, roles) {
    const payload = {
      username,
      roles,
      iat: Date.now(),
      exp: Date.now() + 3600000 // 1 hour
    };

    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(encoded)
      .digest('hex');

    const token = `${encoded}.${signature}`;
    this.tokens.set(token, payload);

    return token;
  }

  /**
   * Verify token
   */
  async verify(token) {
    if (!token) return null;

    const cached = this.tokens.get(token);
    if (cached) {
      if (cached.exp > Date.now()) {
        return cached;
      }
      this.tokens.delete(token);
      return null;
    }

    try {
      const [encoded, signature] = token.split('.');
      const expectedSig = crypto
        .createHmac('sha256', this.secret)
        .update(encoded)
        .digest('hex');

      if (signature !== expectedSig) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(encoded, 'base64').toString());

      if (payload.exp < Date.now()) {
        return null;
      }

      this.tokens.set(token, payload);
      return payload;

    } catch (error) {
      return null;
    }
  }

  /**
   * Check authorization
   */
  async authorize(token, requiredRoles = []) {
    const payload = await this.verify(token);
    if (!payload) return false;

    if (requiredRoles.length === 0) return true;

    return requiredRoles.some(role => payload.roles.includes(role));
  }

  /**
   * Hash password (simplified - use bcrypt in production)
   */
  hashPassword(password) {
    return crypto
      .createHash('sha256')
      .update(password + this.secret)
      .digest('hex');
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Token bucket rate limiter
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.max || 100;
    this.buckets = new Map();

    // Cleanup old buckets
    setInterval(() => this.cleanup(), this.windowMs);
  }

  /**
   * Check if request is allowed
   */
  async check(req) {
    const key = this.getKey(req);
    const now = Date.now();

    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.maxRequests,
        lastRefill: now,
        requests: []
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens
    const timePassed = now - bucket.lastRefill;
    if (timePassed >= this.windowMs) {
      bucket.tokens = this.maxRequests;
      bucket.lastRefill = now;
      bucket.requests = [];
    }

    // Check if request allowed
    if (bucket.tokens > 0) {
      bucket.tokens--;
      bucket.requests.push(now);
      return { allowed: true };
    }

    // Calculate retry after
    const oldestRequest = bucket.requests[0];
    const retryAfter = Math.ceil((oldestRequest + this.windowMs - now) / 1000);

    return {
      allowed: false,
      retryAfter
    };
  }

  /**
   * Get rate limit key from request
   */
  getKey(req) {
    // Use IP address or user ID
    const ip = req.headers['x-forwarded-for'] ||
               req.connection.remoteAddress ||
               'unknown';
    return `ratelimit:${ip}`;
  }

  /**
   * Cleanup old buckets
   */
  cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > this.windowMs * 2) {
        this.buckets.delete(key);
      }
    }
  }
}

// ============================================================================
// RESPONSE CACHING
// ============================================================================

/**
 * In-memory response cache (Redis-compatible interface)
 */
class ResponseCache {
  constructor(ttl = 300) {
    this.ttl = ttl * 1000; // Convert to milliseconds
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0 };

    // Cleanup expired entries
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get cached response
   */
  async get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set cached response
   */
  async set(key, value, ttl = this.ttl) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Delete cached response
   */
  async del(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  async clear() {
    this.cache.clear();
  }

  /**
   * Generate cache key
   */
  generateKey(req) {
    const parts = [
      req.method,
      req.pathname,
      JSON.stringify(req.query),
      JSON.stringify(req.body)
    ];
    return crypto
      .createHash('md5')
      .update(parts.join(':'))
      .digest('hex');
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`
    };
  }
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Request validator (Joi-like interface)
 */
class RequestValidator {
  constructor() {
    this.schemas = new Map();
  }

  /**
   * Register validation schema
   */
  registerSchema(name, schema) {
    this.schemas.set(name, schema);
  }

  /**
   * Validate request
   */
  async validate(schemaName, data) {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return { valid: true, data };
    }

    const errors = [];
    const validated = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required check
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`Field '${field}' is required`);
        continue;
      }

      if (value === undefined || value === null) {
        if (rules.default !== undefined) {
          validated[field] = rules.default;
        }
        continue;
      }

      // Type check
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`Field '${field}' must be of type ${rules.type}`);
          continue;
        }
      }

      // Array validation
      if (rules.type === 'array' && rules.items) {
        if (!this.validateArrayItems(value, rules.items)) {
          errors.push(`Field '${field}' contains invalid items`);
          continue;
        }
      }

      // Number validation
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Field '${field}' must be >= ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Field '${field}' must be <= ${rules.max}`);
        }
      }

      // String validation
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`Field '${field}' must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`Field '${field}' must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          errors.push(`Field '${field}' does not match required pattern`);
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field '${field}' must be one of: ${rules.enum.join(', ')}`);
      }

      validated[field] = value;
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, data: validated };
  }

  /**
   * Validate array items
   */
  validateArrayItems(array, itemType) {
    if (typeof itemType === 'string') {
      return array.every(item => typeof item === itemType);
    }
    return true;
  }
}

// ============================================================================
// METRICS COLLECTION
// ============================================================================

/**
 * Metrics collector
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byPath: {},
        byStatus: {}
      },
      performance: {
        avgResponseTime: 0,
        totalResponseTime: 0,
        count: 0
      },
      errors: {
        total: 0,
        byType: {}
      }
    };
  }

  /**
   * Record metric
   */
  record(type, data) {
    switch (type) {
      case 'request':
        this.recordRequest(data);
        break;
      case 'error':
        this.recordError(data);
        break;
    }
  }

  /**
   * Record request metrics
   */
  recordRequest(data) {
    const { method, path, statusCode, duration } = data;

    this.metrics.requests.total++;
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
    this.metrics.requests.byPath[path] = (this.metrics.requests.byPath[path] || 0) + 1;
    this.metrics.requests.byStatus[statusCode] = (this.metrics.requests.byStatus[statusCode] || 0) + 1;

    this.metrics.performance.totalResponseTime += duration;
    this.metrics.performance.count++;
    this.metrics.performance.avgResponseTime =
      this.metrics.performance.totalResponseTime / this.metrics.performance.count;
  }

  /**
   * Record error metrics
   */
  recordError(data) {
    const { type, message } = data;

    this.metrics.errors.total++;
    this.metrics.errors.byType[type] = (this.metrics.errors.byType[type] || 0) + 1;
  }

  /**
   * Get all metrics
   */
  getAll() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
      uptime: process.uptime()
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: { total: 0, byMethod: {}, byPath: {}, byStatus: {} },
      performance: { avgResponseTime: 0, totalResponseTime: 0, count: 0 },
      errors: { total: 0, byType: {} }
    };
  }
}

// ============================================================================
// API VERSION HANDLERS
// ============================================================================

/**
 * API v1 Handler
 */
class APIv1Handler {
  constructor(server) {
    this.server = server;
    this.auth = server.auth;
    this.validator = server.validator;
    this.cache = server.cache;

    this.registerValidationSchemas();
  }

  /**
   * Register validation schemas
   */
  registerValidationSchemas() {
    this.validator.registerSchema('vectorInsert', {
      id: { type: 'string' },
      vector: { type: 'array', items: 'number', required: true },
      metadata: { type: 'object' }
    });

    this.validator.registerSchema('vectorSearch', {
      query: { type: 'array', items: 'number', required: true },
      k: { type: 'number', default: 10, min: 1, max: 1000 },
      filters: { type: 'object' }
    });

    this.validator.registerSchema('advancedSearch', {
      query: { type: 'string', required: true },
      fuzzy: { type: 'boolean', default: true },
      semantic: { type: 'boolean', default: true },
      filters: { type: 'object' },
      limit: { type: 'number', default: 10, min: 1, max: 100 }
    });
  }

  /**
   * Handle v1 requests
   */
  async handle(req, res) {
    const { pathname, method } = req;

    // Remove /v1 prefix
    const path = pathname.replace(/^\/v1/, '');

    // Authentication endpoints
    if (path === '/auth/login' && method === 'POST') {
      return await this.handleLogin(req, res);
    }

    if (path === '/auth/register' && method === 'POST') {
      return await this.handleRegister(req, res);
    }

    // Require authentication for all other endpoints
    const token = this.server.extractToken(req);
    const user = await this.auth.verify(token);

    if (!user) {
      return this.server.sendError(res, 401, 'Unauthorized');
    }

    req.user = user;

    // Vector endpoints
    if (path === '/vectors' && method === 'GET') {
      return await this.handleListVectors(req, res);
    }

    if (path === '/vectors' && method === 'POST') {
      return await this.handleInsertVector(req, res);
    }

    if (path.match(/^\/vectors\/[^/]+$/) && method === 'GET') {
      return await this.handleGetVector(req, res);
    }

    if (path.match(/^\/vectors\/[^/]+$/) && method === 'PUT') {
      return await this.handleUpdateVector(req, res);
    }

    if (path.match(/^\/vectors\/[^/]+$/) && method === 'DELETE') {
      return await this.handleDeleteVector(req, res);
    }

    if (path === '/vectors/search' && method === 'POST') {
      return await this.handleVectorSearch(req, res);
    }

    if (path === '/vectors/batch' && method === 'POST') {
      return await this.handleBatchInsert(req, res);
    }

    // Search endpoints
    if (path === '/search' && method === 'POST') {
      return await this.handleSearch(req, res);
    }

    // Analytics endpoints
    if (path === '/analytics' && method === 'GET') {
      return await this.handleAnalytics(req, res);
    }

    // Streaming endpoint
    if (path === '/vectors/stream' && method === 'GET') {
      return await this.handleStream(req, res);
    }

    return this.server.sendError(res, 404, 'Not Found');
  }

  /**
   * Handle login
   */
  async handleLogin(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return this.server.sendError(res, 400, 'Username and password required');
    }

    const result = await this.auth.authenticate(username, password);

    if (!result) {
      return this.server.sendError(res, 401, 'Invalid credentials');
    }

    return {
      statusCode: 200,
      data: result
    };
  }

  /**
   * Handle register
   */
  async handleRegister(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return this.server.sendError(res, 400, 'Username and password required');
    }

    this.auth.addUser(username, password, ['user']);

    return {
      statusCode: 201,
      data: {
        message: 'User registered successfully',
        username
      }
    };
  }

  /**
   * Handle list vectors
   */
  async handleListVectors(req, res) {
    const limit = parseInt(req.query.limit || '10');
    const offset = parseInt(req.query.offset || '0');

    if (!this.server.vectorEngine) {
      return this.server.sendError(res, 501, 'Vector engine not configured');
    }

    const stats = this.server.vectorEngine.getStats();
    const vectors = Array.from(this.server.vectorEngine.denseVectors.entries())
      .slice(offset, offset + limit)
      .map(([id, vector]) => ({
        id,
        vector,
        metadata: this.server.vectorEngine.metadata.get(id)
      }));

    return {
      statusCode: 200,
      data: {
        vectors,
        total: stats.vectors.total,
        limit,
        offset
      }
    };
  }

  /**
   * Handle insert vector
   */
  async handleInsertVector(req, res) {
    const validation = await this.validator.validate('vectorInsert', req.body);

    if (!validation.valid) {
      return this.server.sendError(res, 400, 'Validation failed', {
        errors: validation.errors
      });
    }

    if (!this.server.vectorEngine) {
      return this.server.sendError(res, 501, 'Vector engine not configured');
    }

    const { id, vector, metadata } = validation.data;
    const vectorId = id || `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = this.server.vectorEngine.insert(vectorId, vector, { metadata });

    if (!result.success) {
      return this.server.sendError(res, 500, 'Insert failed', { error: result.error });
    }

    // Invalidate cache
    await this.cache.clear();

    return {
      statusCode: 201,
      data: {
        id: vectorId,
        vector,
        metadata,
        inserted: true
      }
    };
  }

  /**
   * Handle get vector
   */
  async handleGetVector(req, res) {
    const id = req.pathname.split('/').pop();

    if (!this.server.vectorEngine) {
      return this.server.sendError(res, 501, 'Vector engine not configured');
    }

    const vector = this.server.vectorEngine.get(id);

    if (!vector) {
      return this.server.sendError(res, 404, 'Vector not found');
    }

    return {
      statusCode: 200,
      data: vector
    };
  }

  /**
   * Handle update vector
   */
  async handleUpdateVector(req, res) {
    const id = req.pathname.split('/').pop();
    const { vector, metadata } = req.body;

    if (!this.server.vectorEngine) {
      return this.server.sendError(res, 501, 'Vector engine not configured');
    }

    const result = this.server.vectorEngine.update(id, vector, { metadata });

    if (!result.success) {
      return this.server.sendError(res, 404, 'Vector not found');
    }

    await this.cache.clear();

    return {
      statusCode: 200,
      data: { id, updated: true }
    };
  }

  /**
   * Handle delete vector
   */
  async handleDeleteVector(req, res) {
    const id = req.pathname.split('/').pop();

    if (!this.server.vectorEngine) {
      return this.server.sendError(res, 501, 'Vector engine not configured');
    }

    const result = this.server.vectorEngine.remove(id);

    if (!result.success) {
      return this.server.sendError(res, 404, 'Vector not found');
    }

    await this.cache.clear();

    return {
      statusCode: 204,
      data: null
    };
  }

  /**
   * Handle vector search
   */
  async handleVectorSearch(req, res) {
    const validation = await this.validator.validate('vectorSearch', req.body);

    if (!validation.valid) {
      return this.server.sendError(res, 400, 'Validation failed', {
        errors: validation.errors
      });
    }

    if (!this.server.vectorEngine) {
      return this.server.sendError(res, 501, 'Vector engine not configured');
    }

    // Check cache
    const cacheKey = this.cache.generateKey(req);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return {
        statusCode: 200,
        data: { ...cached, fromCache: true }
      };
    }

    const { query, k, filters } = validation.data;
    const result = this.server.vectorEngine.search(query, { k, filters });

    // Cache result
    await this.cache.set(cacheKey, result);

    return {
      statusCode: 200,
      data: result
    };
  }

  /**
   * Handle batch insert
   */
  async handleBatchInsert(req, res) {
    if (!req.body.vectors || !Array.isArray(req.body.vectors)) {
      return this.server.sendError(res, 400, 'Invalid batch request');
    }

    if (!this.server.vectorEngine) {
      return this.server.sendError(res, 501, 'Vector engine not configured');
    }

    const items = req.body.vectors.map(v => ({
      id: v.id || `vec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      vector: v.vector,
      metadata: v.metadata
    }));

    const result = this.server.vectorEngine.batchInsert(items);

    await this.cache.clear();

    return {
      statusCode: 201,
      data: result
    };
  }

  /**
   * Handle advanced search
   */
  async handleSearch(req, res) {
    const validation = await this.validator.validate('advancedSearch', req.body);

    if (!validation.valid) {
      return this.server.sendError(res, 400, 'Validation failed', {
        errors: validation.errors
      });
    }

    if (!this.server.searchEngine) {
      return this.server.sendError(res, 501, 'Search engine not configured');
    }

    // Check cache
    const cacheKey = this.cache.generateKey(req);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return {
        statusCode: 200,
        data: { ...cached, fromCache: true }
      };
    }

    const result = await this.server.searchEngine.search(
      validation.data.query,
      validation.data
    );

    // Cache result
    await this.cache.set(cacheKey, result);

    return {
      statusCode: 200,
      data: result
    };
  }

  /**
   * Handle analytics
   */
  async handleAnalytics(req, res) {
    const analytics = {
      server: this.server.metrics.getAll(),
      cache: this.cache.getStats(),
      vector: this.server.vectorEngine ? this.server.vectorEngine.getStats() : null,
      search: this.server.searchEngine ? this.server.searchEngine.getStats() : null
    };

    return {
      statusCode: 200,
      data: analytics
    };
  }

  /**
   * Handle streaming response
   */
  async handleStream(req, res) {
    if (!this.server.vectorEngine) {
      return this.server.sendError(res, 501, 'Vector engine not configured');
    }

    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked'
    });

    // Stream vectors one by one
    let count = 0;
    const limit = parseInt(req.query.limit || '100');

    for (const [id, vector] of this.server.vectorEngine.denseVectors.entries()) {
      if (count >= limit) break;

      const data = {
        id,
        vector,
        metadata: this.server.vectorEngine.metadata.get(id)
      };

      res.write(JSON.stringify(data) + '\n');
      count++;

      // Small delay to prevent overwhelming client
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    res.end();

    return null; // Response already sent
  }
}

/**
 * API v2 Handler (Extended features)
 */
class APIv2Handler extends APIv1Handler {
  constructor(server) {
    super(server);
  }

  async handle(req, res) {
    const { pathname } = req;
    const path = pathname.replace(/^\/v2/, '');

    // Add v2-specific features here
    // For now, delegate to v1
    req.pathname = '/v1' + path;
    return await super.handle(req, res);
  }
}

// ============================================================================
// WEBSOCKET MANAGER
// ============================================================================

/**
 * WebSocket manager for real-time updates
 */
class WebSocketManager extends EventEmitter {
  constructor(server) {
    super();
    this.server = server;
    this.wss = null;
    this.clients = new Set();
    this.subscriptions = new Map();
  }

  /**
   * Attach to HTTP server
   */
  attach(httpServer) {
    this.wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('✓ WebSocket server attached');
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, req) {
    const clientId = crypto.randomBytes(16).toString('hex');

    ws.clientId = clientId;
    ws.isAlive = true;
    ws.subscriptions = new Set();

    this.clients.add(ws);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      this.handleMessage(ws, message);
    });

    ws.on('close', () => {
      this.handleClose(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    this.send(ws, {
      type: 'connected',
      clientId,
      timestamp: Date.now()
    });

    console.log(`✓ WebSocket client connected: ${clientId}`);
  }

  /**
   * Handle WebSocket message
   */
  handleMessage(ws, message) {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(ws, data);
          break;
        case 'unsubscribe':
          this.handleUnsubscribe(ws, data);
          break;
        case 'ping':
          this.send(ws, { type: 'pong', timestamp: Date.now() });
          break;
        default:
          this.send(ws, {
            type: 'error',
            message: 'Unknown message type',
            timestamp: Date.now()
          });
      }
    } catch (error) {
      this.send(ws, {
        type: 'error',
        message: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle subscription
   */
  handleSubscribe(ws, data) {
    const { channel } = data;

    if (!channel) {
      this.send(ws, {
        type: 'error',
        message: 'Channel required',
        timestamp: Date.now()
      });
      return;
    }

    ws.subscriptions.add(channel);

    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel).add(ws);

    this.send(ws, {
      type: 'subscribed',
      channel,
      timestamp: Date.now()
    });

    console.log(`Client ${ws.clientId} subscribed to ${channel}`);
  }

  /**
   * Handle unsubscription
   */
  handleUnsubscribe(ws, data) {
    const { channel } = data;

    if (!channel) return;

    ws.subscriptions.delete(channel);

    if (this.subscriptions.has(channel)) {
      this.subscriptions.get(channel).delete(ws);
    }

    this.send(ws, {
      type: 'unsubscribed',
      channel,
      timestamp: Date.now()
    });
  }

  /**
   * Handle connection close
   */
  handleClose(ws) {
    this.clients.delete(ws);

    // Remove from all subscriptions
    for (const channel of ws.subscriptions) {
      if (this.subscriptions.has(channel)) {
        this.subscriptions.get(channel).delete(ws);
      }
    }

    console.log(`✓ WebSocket client disconnected: ${ws.clientId}`);
  }

  /**
   * Broadcast to channel
   */
  broadcast(channel, data) {
    if (!this.subscriptions.has(channel)) return;

    const message = JSON.stringify({
      type: 'broadcast',
      channel,
      data,
      timestamp: Date.now()
    });

    for (const ws of this.subscriptions.get(channel)) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Send message to client
   */
  send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  startHeartbeat() {
    setInterval(() => {
      for (const ws of this.clients) {
        if (!ws.isAlive) {
          ws.terminate();
          continue;
        }

        ws.isAlive = false;
        ws.ping();
      }
    }, 30000);
  }
}

// ============================================================================
// GRAPHQL API
// ============================================================================

/**
 * GraphQL API (simplified implementation)
 */
class GraphQLAPI {
  constructor(server) {
    this.server = server;
    this.schema = this.buildSchema();
    this.subscriptions = new Map();
  }

  /**
   * Build GraphQL schema
   */
  buildSchema() {
    return {
      Query: {
        vector: (args) => this.resolveVector(args),
        vectors: (args) => this.resolveVectors(args),
        search: (args) => this.resolveSearch(args),
        analytics: () => this.resolveAnalytics()
      },
      Mutation: {
        insertVector: (args) => this.resolveInsertVector(args),
        updateVector: (args) => this.resolveUpdateVector(args),
        deleteVector: (args) => this.resolveDeleteVector(args)
      },
      Subscription: {
        vectorInserted: () => this.subscribeVectorInserted(),
        searchPerformed: () => this.subscribeSearchPerformed()
      }
    };
  }

  /**
   * Handle GraphQL request
   */
  async handle(req, res) {
    if (req.method === 'GET') {
      // GraphQL playground
      return {
        statusCode: 200,
        data: this.getPlaygroundHTML(),
        headers: { 'Content-Type': 'text/html' }
      };
    }

    if (req.method !== 'POST') {
      return this.server.sendError(res, 405, 'Method not allowed');
    }

    const { query, variables, operationName } = req.body;

    if (!query) {
      return this.server.sendError(res, 400, 'Query required');
    }

    try {
      const result = await this.execute(query, variables, operationName);
      return {
        statusCode: 200,
        data: result
      };
    } catch (error) {
      return {
        statusCode: 200,
        data: {
          errors: [{ message: error.message }]
        }
      };
    }
  }

  /**
   * Execute GraphQL query (simplified)
   */
  async execute(query, variables = {}, operationName = null) {
    // This is a simplified executor
    // In production, use a full GraphQL implementation like graphql-js

    const operation = this.parseOperation(query);
    const resolver = this.schema[operation.type]?.[operation.name];

    if (!resolver) {
      throw new Error(`Unknown operation: ${operation.type}.${operation.name}`);
    }

    const result = await resolver(variables);

    return {
      data: {
        [operation.name]: result
      }
    };
  }

  /**
   * Parse GraphQL operation (simplified)
   */
  parseOperation(query) {
    const queryMatch = query.match(/query\s+(\w+)/);
    const mutationMatch = query.match(/mutation\s+(\w+)/);
    const subscriptionMatch = query.match(/subscription\s+(\w+)/);

    if (queryMatch) {
      return { type: 'Query', name: queryMatch[1] };
    } else if (mutationMatch) {
      return { type: 'Mutation', name: mutationMatch[1] };
    } else if (subscriptionMatch) {
      return { type: 'Subscription', name: subscriptionMatch[1] };
    }

    throw new Error('Invalid GraphQL operation');
  }

  /**
   * Resolvers
   */
  async resolveVector({ id }) {
    if (!this.server.vectorEngine) return null;
    return this.server.vectorEngine.get(id);
  }

  async resolveVectors({ limit = 10, offset = 0 }) {
    if (!this.server.vectorEngine) return [];

    return Array.from(this.server.vectorEngine.denseVectors.entries())
      .slice(offset, offset + limit)
      .map(([id, vector]) => ({
        id,
        vector,
        metadata: this.server.vectorEngine.metadata.get(id)
      }));
  }

  async resolveSearch({ query, k = 10 }) {
    if (!this.server.searchEngine) return { results: [] };
    return await this.server.searchEngine.search(query, { limit: k });
  }

  async resolveAnalytics() {
    return this.server.metrics.getAll();
  }

  async resolveInsertVector({ id, vector, metadata }) {
    if (!this.server.vectorEngine) {
      throw new Error('Vector engine not configured');
    }

    const vectorId = id || `vec_${Date.now()}`;
    const result = this.server.vectorEngine.insert(vectorId, vector, { metadata });

    if (!result.success) {
      throw new Error(result.error);
    }

    return { id: vectorId, vector, metadata };
  }

  async resolveUpdateVector({ id, vector, metadata }) {
    if (!this.server.vectorEngine) {
      throw new Error('Vector engine not configured');
    }

    const result = this.server.vectorEngine.update(id, vector, { metadata });

    if (!result.success) {
      throw new Error('Vector not found');
    }

    return { id, vector, metadata };
  }

  async resolveDeleteVector({ id }) {
    if (!this.server.vectorEngine) {
      throw new Error('Vector engine not configured');
    }

    const result = this.server.vectorEngine.remove(id);

    if (!result.success) {
      throw new Error('Vector not found');
    }

    return { id, deleted: true };
  }

  /**
   * Subscription resolvers
   */
  subscribeVectorInserted() {
    // Return async iterator for subscriptions
    return {
      subscribe: () => this.createSubscription('vectorInserted')
    };
  }

  subscribeSearchPerformed() {
    return {
      subscribe: () => this.createSubscription('searchPerformed')
    };
  }

  /**
   * Create subscription
   */
  createSubscription(event) {
    const id = crypto.randomBytes(16).toString('hex');
    const subscription = {
      id,
      event,
      queue: []
    };

    this.subscriptions.set(id, subscription);

    return {
      next: () => {
        return new Promise((resolve) => {
          if (subscription.queue.length > 0) {
            resolve({ value: subscription.queue.shift(), done: false });
          } else {
            subscription.resolver = resolve;
          }
        });
      },
      return: () => {
        this.subscriptions.delete(id);
        return Promise.resolve({ done: true });
      }
    };
  }

  /**
   * Get GraphQL playground HTML
   */
  getPlaygroundHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>GraphQL Playground</title>
  <style>
    body { margin: 0; padding: 0; font-family: monospace; }
    #playground { height: 100vh; display: flex; flex-direction: column; }
    #query { flex: 1; padding: 20px; border: none; resize: none; }
    #execute { padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer; }
    #result { flex: 1; padding: 20px; background: #f5f5f5; overflow: auto; }
  </style>
</head>
<body>
  <div id="playground">
    <textarea id="query" placeholder="Enter GraphQL query...">query GetVectors {
  vectors(limit: 10) {
    id
    vector
    metadata
  }
}</textarea>
    <button id="execute" onclick="executeQuery()">Execute Query</button>
    <pre id="result"></pre>
  </div>
  <script>
    async function executeQuery() {
      const query = document.getElementById('query').value;
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const result = await response.json();
      document.getElementById('result').textContent = JSON.stringify(result, null, 2);
    }
  </script>
</body>
</html>
    `.trim();
  }
}

// ============================================================================
// SDK GENERATOR
// ============================================================================

/**
 * SDK Generator for client libraries
 */
class SDKGenerator {
  constructor(server) {
    this.server = server;
  }

  /**
   * Generate JavaScript/TypeScript SDK
   */
  generateJavaScriptSDK() {
    return `
/**
 * AI Knowledge Nexus SDK
 * Auto-generated client library
 */

class NexusClient {
  constructor(baseURL, apiKey) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  async request(method, path, body = null) {
    const url = \`\${this.baseURL}\${path}\`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${this.apiKey}\`
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return await response.json();
  }

  // Vector operations
  async insertVector(vector, metadata = {}) {
    return await this.request('POST', '/v1/vectors', { vector, metadata });
  }

  async getVector(id) {
    return await this.request('GET', \`/v1/vectors/\${id}\`);
  }

  async updateVector(id, vector, metadata) {
    return await this.request('PUT', \`/v1/vectors/\${id}\`, { vector, metadata });
  }

  async deleteVector(id) {
    return await this.request('DELETE', \`/v1/vectors/\${id}\`);
  }

  async searchVectors(query, k = 10) {
    return await this.request('POST', '/v1/vectors/search', { query, k });
  }

  // Search operations
  async search(query, options = {}) {
    return await this.request('POST', '/v1/search', { query, ...options });
  }

  // Analytics
  async getAnalytics() {
    return await this.request('GET', '/v1/analytics');
  }
}

module.exports = NexusClient;
    `.trim();
  }

  /**
   * Generate Python SDK
   */
  generatePythonSDK() {
    return `
"""
AI Knowledge Nexus SDK
Auto-generated client library
"""

import requests
from typing import List, Dict, Optional, Any

class NexusClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, path: str, json: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}{path}"
        response = self.session.request(method, url, json=json)
        response.raise_for_status()
        return response.json()

    # Vector operations
    def insert_vector(self, vector: List[float], metadata: Optional[Dict] = None) -> Dict:
        return self._request('POST', '/v1/vectors', {'vector': vector, 'metadata': metadata or {}})

    def get_vector(self, id: str) -> Dict:
        return self._request('GET', f'/v1/vectors/{id}')

    def update_vector(self, id: str, vector: List[float], metadata: Optional[Dict] = None) -> Dict:
        return self._request('PUT', f'/v1/vectors/{id}', {'vector': vector, 'metadata': metadata})

    def delete_vector(self, id: str) -> Dict:
        return self._request('DELETE', f'/v1/vectors/{id}')

    def search_vectors(self, query: List[float], k: int = 10) -> Dict:
        return self._request('POST', '/v1/vectors/search', {'query': query, 'k': k})

    # Search operations
    def search(self, query: str, **options) -> Dict:
        return self._request('POST', '/v1/search', {'query': query, **options})

    # Analytics
    def get_analytics(self) -> Dict:
        return self._request('GET', '/v1/analytics')
    `.trim();
  }

  /**
   * Generate cURL examples
   */
  generateCurlExamples() {
    const baseURL = `http://${this.server.options.host}:${this.server.options.port}`;

    return `
# AI Knowledge Nexus API - cURL Examples

# Login
curl -X POST ${baseURL}/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin123"}'

# Insert Vector
curl -X POST ${baseURL}/v1/vectors \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"vector":[0.1,0.2,0.3],"metadata":{"name":"test"}}'

# Search Vectors
curl -X POST ${baseURL}/v1/vectors/search \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"query":[0.1,0.2,0.3],"k":10}'

# Advanced Search
curl -X POST ${baseURL}/v1/search \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"machine learning","fuzzy":true,"semantic":true,"limit":10}'

# Get Analytics
curl -X GET ${baseURL}/v1/analytics \\
  -H "Authorization: Bearer YOUR_TOKEN"
    `.trim();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  NexusAPIServer,
  AuthenticationManager,
  RateLimiter,
  ResponseCache,
  RequestValidator,
  MetricsCollector,
  WebSocketManager,
  GraphQLAPI,
  SDKGenerator
};

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

if (require.main === module) {
  // Example: Start the API server
  const { VectorEngine } = require('../core/vector-engine');
  const { UltraSearchEngine } = require('../search/ultra-search');

  const vectorEngine = new VectorEngine({ dimensions: 384 });
  const searchEngine = new UltraSearchEngine();

  const server = new NexusAPIServer({
    port: 3000,
    vectorEngine,
    searchEngine,
    jwtSecret: 'your-secret-key',
    wsEnabled: true,
    graphqlEnabled: true
  });

  server.start().then(() => {
    console.log('✓ API Server ready');
    console.log('  - REST API: http://localhost:3000/v1');
    console.log('  - GraphQL: http://localhost:3000/graphql');
    console.log('  - WebSocket: ws://localhost:3000/ws');
    console.log('  - API Docs: http://localhost:3000/api-docs');
  }).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });
}
