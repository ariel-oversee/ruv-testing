/**
 * Performance Optimization and Benchmarking Engine
 * AI Knowledge Nexus - Performance Engineering System
 *
 * Features:
 * - Real-time performance monitoring
 * - Comprehensive benchmarking suite
 * - Memory profiling and leak detection
 * - Query performance analysis
 * - Automatic optimization suggestions
 * - Load testing capabilities
 * - Performance regression detection
 * - Resource usage tracking
 * - Distributed performance metrics
 * - Performance dashboard data
 */

const os = require('os');
const { performance, PerformanceObserver } = require('perf_hooks');
const EventEmitter = require('events');

class PerformanceEngine extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      enableRealTimeMonitoring: true,
      enableMemoryProfiling: true,
      enableQueryAnalysis: true,
      sampleRate: 100, // milliseconds
      historySize: 10000,
      regressionThreshold: 0.15, // 15% degradation threshold
      alertThreshold: {
        cpu: 80, // percentage
        memory: 85, // percentage
        latency: 1000, // milliseconds
      },
      ...config
    };

    // Performance metrics storage
    this.metrics = {
      queries: [],
      operations: [],
      memory: [],
      cpu: [],
      cache: {
        hits: 0,
        misses: 0,
        size: 0
      },
      embeddings: [],
      api: []
    };

    // Benchmark results
    this.benchmarks = new Map();

    // Performance baselines for regression detection
    this.baselines = new Map();

    // Active monitoring intervals
    this.monitors = [];

    // Load test sessions
    this.loadTests = new Map();

    // Performance observer
    this.setupPerformanceObserver();

    // Real-time monitoring
    if (this.config.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }
  }

  /**
   * Setup Performance Observer for automatic metric collection
   */
  setupPerformanceObserver() {
    this.observer = new PerformanceObserver((items) => {
      items.getEntries().forEach((entry) => {
        this.recordPerformanceEntry(entry);
      });
    });

    this.observer.observe({
      entryTypes: ['measure', 'function', 'gc'],
      buffered: true
    });
  }

  /**
   * Record performance entry
   */
  recordPerformanceEntry(entry) {
    const metric = {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      type: entry.entryType,
      timestamp: Date.now()
    };

    if (entry.entryType === 'measure') {
      this.metrics.operations.push(metric);
    } else if (entry.entryType === 'gc') {
      this.metrics.memory.push({
        ...metric,
        kind: entry.kind,
        flags: entry.flags
      });
    }

    this.trimHistory();
    this.emit('metric', metric);
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring() {
    // CPU monitoring
    const cpuMonitor = setInterval(() => {
      const cpuUsage = this.getCPUUsage();
      this.metrics.cpu.push({
        usage: cpuUsage,
        timestamp: Date.now()
      });

      if (cpuUsage > this.config.alertThreshold.cpu) {
        this.emit('alert', {
          type: 'cpu',
          value: cpuUsage,
          threshold: this.config.alertThreshold.cpu,
          message: `High CPU usage detected: ${cpuUsage.toFixed(2)}%`
        });
      }
    }, this.config.sampleRate);

    // Memory monitoring
    const memoryMonitor = setInterval(() => {
      const memUsage = this.getMemoryUsage();
      this.metrics.memory.push({
        ...memUsage,
        timestamp: Date.now()
      });

      const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      if (memPercentage > this.config.alertThreshold.memory) {
        this.emit('alert', {
          type: 'memory',
          value: memPercentage,
          threshold: this.config.alertThreshold.memory,
          message: `High memory usage: ${memPercentage.toFixed(2)}%`
        });
      }
    }, this.config.sampleRate);

    this.monitors.push(cpuMonitor, memoryMonitor);
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    this.monitors.forEach(monitor => clearInterval(monitor));
    this.monitors = [];
  }

  /**
   * Benchmark a function
   */
  async benchmark(name, fn, options = {}) {
    const {
      iterations = 1000,
      warmup = 100,
      parallel = false,
      args = []
    } = options;

    console.log(`📊 Running benchmark: ${name}`);

    // Warmup phase
    console.log(`  🔥 Warming up (${warmup} iterations)...`);
    for (let i = 0; i < warmup; i++) {
      await fn(...args);
    }

    // Collect garbage before benchmarking
    if (global.gc) {
      global.gc();
    }

    // Benchmark phase
    console.log(`  ⚡ Benchmarking (${iterations} iterations)...`);
    const results = {
      name,
      iterations,
      durations: [],
      errors: 0,
      timestamp: Date.now()
    };

    const startMemory = process.memoryUsage();
    const startTime = performance.now();

    if (parallel) {
      // Parallel execution
      const promises = Array(iterations).fill().map(async (_, i) => {
        const iterStart = performance.now();
        try {
          await fn(...args);
          return performance.now() - iterStart;
        } catch (error) {
          results.errors++;
          return null;
        }
      });

      const durations = await Promise.all(promises);
      results.durations = durations.filter(d => d !== null);
    } else {
      // Sequential execution
      for (let i = 0; i < iterations; i++) {
        const iterStart = performance.now();
        try {
          await fn(...args);
          results.durations.push(performance.now() - iterStart);
        } catch (error) {
          results.errors++;
        }
      }
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    // Calculate statistics
    results.stats = this.calculateStats(results.durations);
    results.totalTime = endTime - startTime;
    results.throughput = iterations / (results.totalTime / 1000); // ops/sec
    results.memoryDelta = {
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
    };

    // Store benchmark results
    this.benchmarks.set(name, results);

    // Check for regression
    if (this.baselines.has(name)) {
      const baseline = this.baselines.get(name);
      const regression = this.detectRegression(baseline.stats, results.stats);
      if (regression.detected) {
        this.emit('regression', {
          name,
          baseline: baseline.stats,
          current: results.stats,
          degradation: regression.degradation,
          message: `Performance regression detected in ${name}: ${regression.degradation.toFixed(2)}% slower`
        });
      }
    }

    console.log(`  ✅ Benchmark complete`);
    this.printBenchmarkResults(results);

    return results;
  }

  /**
   * Calculate statistical metrics
   */
  calculateStats(durations) {
    if (durations.length === 0) {
      return null;
    }

    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;

    // Calculate variance and standard deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles
    const p50 = this.percentile(sorted, 0.50);
    const p75 = this.percentile(sorted, 0.75);
    const p90 = this.percentile(sorted, 0.90);
    const p95 = this.percentile(sorted, 0.95);
    const p99 = this.percentile(sorted, 0.99);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: p50,
      stdDev,
      variance,
      percentiles: { p50, p75, p90, p95, p99 }
    };
  }

  /**
   * Calculate percentile
   */
  percentile(sorted, p) {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Print benchmark results
   */
  printBenchmarkResults(results) {
    console.log(`\n📈 Results for "${results.name}":`);
    console.log(`  Iterations: ${results.iterations}`);
    console.log(`  Total time: ${results.totalTime.toFixed(2)}ms`);
    console.log(`  Throughput: ${results.throughput.toFixed(2)} ops/sec`);
    console.log(`  Errors: ${results.errors}`);

    if (results.stats) {
      console.log(`\n  ⏱️  Latency:`);
      console.log(`    Min:    ${results.stats.min.toFixed(3)}ms`);
      console.log(`    Mean:   ${results.stats.mean.toFixed(3)}ms`);
      console.log(`    Median: ${results.stats.median.toFixed(3)}ms`);
      console.log(`    Max:    ${results.stats.max.toFixed(3)}ms`);
      console.log(`    Std Dev: ${results.stats.stdDev.toFixed(3)}ms`);

      console.log(`\n  📊 Percentiles:`);
      console.log(`    p50: ${results.stats.percentiles.p50.toFixed(3)}ms`);
      console.log(`    p75: ${results.stats.percentiles.p75.toFixed(3)}ms`);
      console.log(`    p90: ${results.stats.percentiles.p90.toFixed(3)}ms`);
      console.log(`    p95: ${results.stats.percentiles.p95.toFixed(3)}ms`);
      console.log(`    p99: ${results.stats.percentiles.p99.toFixed(3)}ms`);
    }

    console.log(`\n  💾 Memory Delta:`);
    console.log(`    Heap: ${this.formatBytes(results.memoryDelta.heapUsed)}`);
    console.log(`    External: ${this.formatBytes(results.memoryDelta.external)}`);
    console.log(`    Array Buffers: ${this.formatBytes(results.memoryDelta.arrayBuffers)}`);
    console.log('');
  }

  /**
   * Track query performance
   */
  trackQuery(queryId, metadata = {}) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    return {
      end: (results = {}) => {
        const duration = performance.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;

        const queryMetric = {
          queryId,
          duration,
          memoryUsed,
          timestamp: Date.now(),
          ...metadata,
          ...results
        };

        this.metrics.queries.push(queryMetric);
        this.trimHistory();

        // Check for slow queries
        if (duration > this.config.alertThreshold.latency) {
          this.emit('alert', {
            type: 'slow-query',
            queryId,
            duration,
            threshold: this.config.alertThreshold.latency,
            message: `Slow query detected: ${queryId} took ${duration.toFixed(2)}ms`
          });
        }

        return queryMetric;
      }
    };
  }

  /**
   * Track cache performance
   */
  trackCacheHit(hit = true, size = 0) {
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }
    this.metrics.cache.size = size;

    const hitRate = this.getCacheHitRate();
    this.emit('cache-metric', {
      hits: this.metrics.cache.hits,
      misses: this.metrics.cache.misses,
      hitRate,
      size
    });

    return hitRate;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate() {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    return total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  /**
   * Track embedding generation performance
   */
  trackEmbedding(vectorSize, modelName) {
    const startTime = performance.now();

    return {
      end: () => {
        const duration = performance.now() - startTime;
        const metric = {
          duration,
          vectorSize,
          modelName,
          timestamp: Date.now(),
          speed: vectorSize / duration // dimensions per millisecond
        };

        this.metrics.embeddings.push(metric);
        this.trimHistory();

        return metric;
      }
    };
  }

  /**
   * Run load test
   */
  async runLoadTest(name, fn, options = {}) {
    const {
      duration = 60000, // 1 minute
      concurrency = 10,
      rampUp = 5000, // 5 seconds
      targetRPS = null // requests per second
    } = options;

    console.log(`\n🔥 Starting load test: ${name}`);
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Concurrency: ${concurrency}`);
    console.log(`  Ramp-up: ${rampUp}ms`);
    if (targetRPS) {
      console.log(`  Target RPS: ${targetRPS}`);
    }

    const testId = `${name}-${Date.now()}`;
    const testResults = {
      name,
      testId,
      startTime: Date.now(),
      requests: [],
      errors: [],
      config: options
    };

    this.loadTests.set(testId, testResults);

    const endTime = Date.now() + duration;
    const rampUpEnd = Date.now() + rampUp;
    let activeWorkers = 0;
    let requestCount = 0;

    // Worker function
    const worker = async () => {
      while (Date.now() < endTime) {
        const reqStart = performance.now();
        const reqTimestamp = Date.now();

        try {
          await fn();
          const reqDuration = performance.now() - reqStart;

          testResults.requests.push({
            duration: reqDuration,
            timestamp: reqTimestamp,
            success: true
          });

          requestCount++;

          // Rate limiting
          if (targetRPS) {
            const delay = (1000 / targetRPS) * concurrency;
            await this.sleep(Math.max(0, delay - reqDuration));
          }
        } catch (error) {
          testResults.errors.push({
            error: error.message,
            timestamp: reqTimestamp,
            duration: performance.now() - reqStart
          });
        }
      }

      activeWorkers--;
    };

    // Ramp-up phase
    const rampUpInterval = rampUp / concurrency;
    for (let i = 0; i < concurrency; i++) {
      if (Date.now() >= rampUpEnd) {
        break;
      }

      activeWorkers++;
      worker();

      if (i < concurrency - 1) {
        await this.sleep(rampUpInterval);
      }
    }

    // Start remaining workers immediately after ramp-up
    while (activeWorkers < concurrency) {
      activeWorkers++;
      worker();
    }

    // Wait for all workers to complete
    while (activeWorkers > 0) {
      await this.sleep(100);
    }

    // Calculate results
    testResults.endTime = Date.now();
    testResults.actualDuration = testResults.endTime - testResults.startTime;
    testResults.totalRequests = testResults.requests.length;
    testResults.totalErrors = testResults.errors.length;
    testResults.successRate = (testResults.totalRequests / (testResults.totalRequests + testResults.totalErrors)) * 100;
    testResults.actualRPS = testResults.totalRequests / (testResults.actualDuration / 1000);

    const durations = testResults.requests.map(r => r.duration);
    testResults.stats = this.calculateStats(durations);

    console.log(`\n✅ Load test complete: ${name}`);
    this.printLoadTestResults(testResults);

    return testResults;
  }

  /**
   * Print load test results
   */
  printLoadTestResults(results) {
    console.log(`\n📊 Load Test Results: "${results.name}"`);
    console.log(`  Duration: ${results.actualDuration}ms`);
    console.log(`  Total Requests: ${results.totalRequests}`);
    console.log(`  Errors: ${results.totalErrors}`);
    console.log(`  Success Rate: ${results.successRate.toFixed(2)}%`);
    console.log(`  Actual RPS: ${results.actualRPS.toFixed(2)}`);

    if (results.stats) {
      console.log(`\n  ⏱️  Response Times:`);
      console.log(`    Min:    ${results.stats.min.toFixed(3)}ms`);
      console.log(`    Mean:   ${results.stats.mean.toFixed(3)}ms`);
      console.log(`    Median: ${results.stats.median.toFixed(3)}ms`);
      console.log(`    Max:    ${results.stats.max.toFixed(3)}ms`);

      console.log(`\n  📊 Percentiles:`);
      console.log(`    p50: ${results.stats.percentiles.p50.toFixed(3)}ms`);
      console.log(`    p90: ${results.stats.percentiles.p90.toFixed(3)}ms`);
      console.log(`    p95: ${results.stats.percentiles.p95.toFixed(3)}ms`);
      console.log(`    p99: ${results.stats.percentiles.p99.toFixed(3)}ms`);
    }
    console.log('');
  }

  /**
   * Detect performance regression
   */
  detectRegression(baseline, current) {
    if (!baseline || !current) {
      return { detected: false };
    }

    const degradation = ((current.mean - baseline.mean) / baseline.mean) * 100;
    const detected = degradation > (this.config.regressionThreshold * 100);

    return {
      detected,
      degradation,
      baseline: baseline.mean,
      current: current.mean
    };
  }

  /**
   * Set performance baseline
   */
  setBaseline(name, stats) {
    this.baselines.set(name, {
      stats,
      timestamp: Date.now()
    });
    console.log(`📍 Baseline set for "${name}"`);
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions() {
    const suggestions = [];

    // Check cache efficiency
    const hitRate = this.getCacheHitRate();
    if (hitRate < 50) {
      suggestions.push({
        type: 'cache',
        severity: 'high',
        message: `Low cache hit rate (${hitRate.toFixed(2)}%). Consider increasing cache size or improving cache strategy.`,
        metric: hitRate
      });
    }

    // Check for slow queries
    const slowQueries = this.metrics.queries.filter(q => q.duration > this.config.alertThreshold.latency);
    if (slowQueries.length > 0) {
      const avgSlowDuration = slowQueries.reduce((sum, q) => sum + q.duration, 0) / slowQueries.length;
      suggestions.push({
        type: 'query',
        severity: 'high',
        message: `${slowQueries.length} slow queries detected (avg: ${avgSlowDuration.toFixed(2)}ms). Consider adding indexes or optimizing query logic.`,
        count: slowQueries.length,
        avgDuration: avgSlowDuration
      });
    }

    // Check memory usage trends
    if (this.metrics.memory.length > 100) {
      const recentMemory = this.metrics.memory.slice(-100);
      const memoryTrend = this.calculateTrend(recentMemory.map(m => m.heapUsed || 0));

      if (memoryTrend > 0.1) {
        suggestions.push({
          type: 'memory',
          severity: 'medium',
          message: 'Memory usage is trending upward. Possible memory leak detected.',
          trend: memoryTrend
        });
      }
    }

    // Check CPU usage
    if (this.metrics.cpu.length > 0) {
      const avgCPU = this.metrics.cpu.slice(-100).reduce((sum, c) => sum + c.usage, 0) / Math.min(100, this.metrics.cpu.length);
      if (avgCPU > 70) {
        suggestions.push({
          type: 'cpu',
          severity: 'medium',
          message: `High average CPU usage (${avgCPU.toFixed(2)}%). Consider optimizing compute-intensive operations or scaling horizontally.`,
          avgUsage: avgCPU
        });
      }
    }

    // Check embedding performance
    if (this.metrics.embeddings.length > 0) {
      const avgEmbeddingSpeed = this.metrics.embeddings.reduce((sum, e) => sum + e.speed, 0) / this.metrics.embeddings.length;
      if (avgEmbeddingSpeed < 1) { // Less than 1 dimension per ms
        suggestions.push({
          type: 'embedding',
          severity: 'low',
          message: `Embedding generation is slow (${avgEmbeddingSpeed.toFixed(3)} dims/ms). Consider using a faster model or batching requests.`,
          avgSpeed: avgEmbeddingSpeed
        });
      }
    }

    return suggestions;
  }

  /**
   * Calculate trend (simple linear regression slope)
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Get performance dashboard data
   */
  getDashboardData() {
    const now = Date.now();
    const last5Minutes = now - 5 * 60 * 1000;
    const last1Hour = now - 60 * 60 * 1000;

    return {
      summary: {
        totalQueries: this.metrics.queries.length,
        totalOperations: this.metrics.operations.length,
        cacheHitRate: this.getCacheHitRate(),
        avgQueryLatency: this.getAverageQueryLatency(),
        currentMemoryUsage: this.getMemoryUsage(),
        currentCPUUsage: this.getCPUUsage()
      },
      recent: {
        queries: this.metrics.queries.filter(q => q.timestamp > last5Minutes),
        operations: this.metrics.operations.filter(o => o.timestamp > last5Minutes),
        memory: this.metrics.memory.filter(m => m.timestamp > last5Minutes),
        cpu: this.metrics.cpu.filter(c => c.timestamp > last5Minutes)
      },
      hourly: {
        queries: this.metrics.queries.filter(q => q.timestamp > last1Hour),
        operations: this.metrics.operations.filter(o => o.timestamp > last1Hour)
      },
      benchmarks: Array.from(this.benchmarks.entries()).map(([name, results]) => ({
        name,
        stats: results.stats,
        throughput: results.throughput,
        timestamp: results.timestamp
      })),
      suggestions: this.getOptimizationSuggestions(),
      alerts: this.getRecentAlerts()
    };
  }

  /**
   * Get average query latency
   */
  getAverageQueryLatency() {
    if (this.metrics.queries.length === 0) return 0;
    const sum = this.metrics.queries.reduce((acc, q) => acc + q.duration, 0);
    return sum / this.metrics.queries.length;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts() {
    // This would be populated by event listeners in a real implementation
    return [];
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      arrayBuffers: usage.arrayBuffers,
      rss: usage.rss,
      percentage: (usage.heapUsed / usage.heapTotal) * 100
    };
  }

  /**
   * Get CPU usage
   */
  getCPUUsage() {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => {
      return acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }, 0);

    const avgIdle = totalIdle / cpus.length;
    const avgTotal = totalTick / cpus.length;

    return ((1 - avgIdle / avgTotal) * 100);
  }

  /**
   * Profile memory usage over time
   */
  async profileMemory(duration = 10000, interval = 100) {
    console.log(`🔍 Profiling memory for ${duration}ms...`);

    const profile = {
      startTime: Date.now(),
      duration,
      interval,
      samples: []
    };

    const startMemory = this.getMemoryUsage();
    profile.startMemory = startMemory;

    const sampleCount = duration / interval;
    for (let i = 0; i < sampleCount; i++) {
      const sample = {
        timestamp: Date.now(),
        ...this.getMemoryUsage()
      };
      profile.samples.push(sample);
      await this.sleep(interval);
    }

    profile.endMemory = this.getMemoryUsage();
    profile.memoryDelta = profile.endMemory.heapUsed - profile.startMemory.heapUsed;
    profile.leakDetected = this.detectMemoryLeak(profile.samples);

    console.log(`✅ Memory profiling complete`);
    console.log(`  Memory delta: ${this.formatBytes(profile.memoryDelta)}`);
    console.log(`  Leak detected: ${profile.leakDetected ? '⚠️  YES' : '✅ NO'}`);

    return profile;
  }

  /**
   * Detect memory leak
   */
  detectMemoryLeak(samples) {
    if (samples.length < 10) return false;

    const heapValues = samples.map(s => s.heapUsed);
    const trend = this.calculateTrend(heapValues);

    // If memory is consistently growing, it might be a leak
    return trend > (samples[0].heapUsed * 0.001); // 0.1% of initial memory per sample
  }

  /**
   * Calculate index efficiency score
   */
  calculateIndexEfficiency(queryResults) {
    // Mock calculation - in a real implementation, this would analyze
    // query execution plans and index usage
    const {
      totalScanned = 0,
      resultsReturned = 0,
      indexesUsed = 0,
      totalIndexes = 0
    } = queryResults;

    if (totalScanned === 0) return 100;

    const scanEfficiency = (resultsReturned / totalScanned) * 100;
    const indexUsageRate = totalIndexes > 0 ? (indexesUsed / totalIndexes) * 100 : 0;

    return (scanEfficiency * 0.7 + indexUsageRate * 0.3);
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics() {
    return {
      timestamp: Date.now(),
      metrics: this.metrics,
      benchmarks: Array.from(this.benchmarks.entries()),
      baselines: Array.from(this.baselines.entries()),
      config: this.config
    };
  }

  /**
   * Import metrics from JSON
   */
  importMetrics(data) {
    if (data.metrics) {
      this.metrics = data.metrics;
    }
    if (data.benchmarks) {
      this.benchmarks = new Map(data.benchmarks);
    }
    if (data.baselines) {
      this.baselines = new Map(data.baselines);
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      queries: [],
      operations: [],
      memory: [],
      cpu: [],
      cache: { hits: 0, misses: 0, size: 0 },
      embeddings: [],
      api: []
    };
    this.benchmarks.clear();
    this.emit('reset');
  }

  /**
   * Trim history to prevent memory bloat
   */
  trimHistory() {
    const { historySize } = this.config;

    if (this.metrics.queries.length > historySize) {
      this.metrics.queries = this.metrics.queries.slice(-historySize);
    }
    if (this.metrics.operations.length > historySize) {
      this.metrics.operations = this.metrics.operations.slice(-historySize);
    }
    if (this.metrics.memory.length > historySize) {
      this.metrics.memory = this.metrics.memory.slice(-historySize);
    }
    if (this.metrics.cpu.length > historySize) {
      this.metrics.cpu = this.metrics.cpu.slice(-historySize);
    }
    if (this.metrics.embeddings.length > historySize) {
      this.metrics.embeddings = this.metrics.embeddings.slice(-historySize);
    }
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    this.stopRealTimeMonitoring();
    if (this.observer) {
      this.observer.disconnect();
    }
    this.loadTests.clear();
    this.removeAllListeners();
    console.log('📊 Performance engine shutdown complete');
  }

  /**
   * Utility: Format bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Utility: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Example Usage and Test Suite
 */
async function runExamples() {
  console.log('🚀 Performance Engine - Example Usage\n');

  const engine = new PerformanceEngine({
    enableRealTimeMonitoring: false // Disable for examples
  });

  // 1. Benchmark a simple function
  console.log('📊 Example 1: Basic Benchmark');
  await engine.benchmark('array-sort', () => {
    const arr = Array.from({ length: 10000 }, () => Math.random());
    arr.sort((a, b) => a - b);
  }, { iterations: 100 });

  // Set as baseline
  engine.setBaseline('array-sort', engine.benchmarks.get('array-sort').stats);

  // 2. Track query performance
  console.log('\n📊 Example 2: Query Tracking');
  const query = engine.trackQuery('test-query-1', { type: 'similarity-search' });
  await engine.sleep(Math.random() * 100);
  query.end({ resultsCount: 10 });

  // 3. Track cache performance
  console.log('\n📊 Example 3: Cache Tracking');
  engine.trackCacheHit(true, 1000);
  engine.trackCacheHit(true, 1001);
  engine.trackCacheHit(false, 1001);
  console.log(`Cache hit rate: ${engine.getCacheHitRate().toFixed(2)}%`);

  // 4. Track embedding generation
  console.log('\n📊 Example 4: Embedding Tracking');
  const embedding = engine.trackEmbedding(1536, 'text-embedding-ada-002');
  await engine.sleep(50);
  const embeddingMetric = embedding.end();
  console.log(`Embedding speed: ${embeddingMetric.speed.toFixed(3)} dims/ms`);

  // 5. Memory profiling
  console.log('\n📊 Example 5: Memory Profiling');
  await engine.profileMemory(1000, 100);

  // 6. Get optimization suggestions
  console.log('\n📊 Example 6: Optimization Suggestions');
  const suggestions = engine.getOptimizationSuggestions();
  suggestions.forEach(s => {
    console.log(`  [${s.severity.toUpperCase()}] ${s.type}: ${s.message}`);
  });

  // 7. Dashboard data
  console.log('\n📊 Example 7: Dashboard Data');
  const dashboard = engine.getDashboardData();
  console.log(`  Total queries: ${dashboard.summary.totalQueries}`);
  console.log(`  Avg query latency: ${dashboard.summary.avgQueryLatency.toFixed(2)}ms`);
  console.log(`  Cache hit rate: ${dashboard.summary.cacheHitRate.toFixed(2)}%`);
  console.log(`  Memory usage: ${engine.formatBytes(dashboard.summary.currentMemoryUsage.heapUsed)}`);

  // 8. Load test (short duration for example)
  console.log('\n📊 Example 8: Load Test');
  await engine.runLoadTest('simple-operation', async () => {
    await engine.sleep(Math.random() * 10);
  }, {
    duration: 2000,
    concurrency: 5,
    rampUp: 500
  });

  engine.shutdown();
  console.log('\n✅ All examples completed!');
}

// Export
module.exports = {
  PerformanceEngine,
  runExamples
};

// Run examples if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}
