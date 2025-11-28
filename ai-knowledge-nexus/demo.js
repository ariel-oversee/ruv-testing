#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║           AI KNOWLEDGE NEXUS - COMPREHENSIVE DEMO                     ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * Interactive demonstration of all features:
 * - Vector Search & Embeddings
 * - RAG Query System
 * - Ultra Search Engine
 * - Web Scraping
 * - Vector Visualization
 * - Performance Benchmarking
 */

const chalk = require('chalk');
const gradient = require('gradient-string');
const figlet = require('figlet');
const ora = require('ora');
const boxen = require('boxen');
const Table = require('cli-table3');
const inquirer = require('inquirer');

const { KnowledgeNexus } = require('./src/index');

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEMO_CONFIG = {
  vectorDimensions: 384,
  embeddingProvider: 'local',
  embeddingModel: 'all-MiniLM-L6-v2',
  embeddingDimensions: 384,
  enableCache: true,
  enableMonitoring: true,
  ragStrategy: 'hybrid',
  enableScraping: false, // Disable for demo
  maxResults: 10
};

// Sample documents for demonstration
const SAMPLE_DOCUMENTS = [
  {
    content: 'Artificial Intelligence (AI) is the simulation of human intelligence by machines, especially computer systems. AI includes machine learning, natural language processing, and computer vision.',
    metadata: { type: 'definition', category: 'ai', tags: ['ai', 'ml', 'technology'] }
  },
  {
    content: 'Machine Learning is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can access data and learn from it.',
    metadata: { type: 'definition', category: 'ml', tags: ['ml', 'algorithms', 'data'] }
  },
  {
    content: 'Deep Learning is a subset of machine learning that uses neural networks with multiple layers. It excels at processing unstructured data like images, text, and audio.',
    metadata: { type: 'definition', category: 'deep-learning', tags: ['deep-learning', 'neural-networks', 'ml'] }
  },
  {
    content: 'Natural Language Processing (NLP) is a branch of AI that helps computers understand, interpret, and manipulate human language. NLP powers applications like chatbots, translation, and sentiment analysis.',
    metadata: { type: 'definition', category: 'nlp', tags: ['nlp', 'language', 'ai'] }
  },
  {
    content: 'Computer Vision enables computers to derive meaningful information from digital images and videos. It uses deep learning to identify and classify objects, faces, and scenes.',
    metadata: { type: 'definition', category: 'cv', tags: ['computer-vision', 'image-processing', 'deep-learning'] }
  },
  {
    content: 'Reinforcement Learning is a type of machine learning where an agent learns to make decisions by taking actions in an environment to maximize cumulative reward.',
    metadata: { type: 'definition', category: 'rl', tags: ['reinforcement-learning', 'ml', 'agents'] }
  },
  {
    content: 'Vector databases store and retrieve high-dimensional vectors efficiently. They enable semantic search, recommendation systems, and similarity matching at scale.',
    metadata: { type: 'definition', category: 'databases', tags: ['vectors', 'databases', 'search'] }
  },
  {
    content: 'Embeddings are dense vector representations of data that capture semantic meaning. They allow computers to understand relationships between words, sentences, or documents.',
    metadata: { type: 'definition', category: 'embeddings', tags: ['embeddings', 'vectors', 'nlp'] }
  },
  {
    content: 'Retrieval-Augmented Generation (RAG) combines information retrieval with language generation. It retrieves relevant documents and uses them as context to generate accurate, grounded responses.',
    metadata: { type: 'definition', category: 'rag', tags: ['rag', 'llm', 'retrieval'] }
  },
  {
    content: 'Transformers are a neural network architecture that revolutionized NLP. They use self-attention mechanisms to process sequential data and power models like GPT and BERT.',
    metadata: { type: 'definition', category: 'transformers', tags: ['transformers', 'nlp', 'neural-networks'] }
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function printHeader(title) {
  console.log('\n' + chalk.cyan('═'.repeat(80)));
  console.log(chalk.cyan.bold('  ' + title));
  console.log(chalk.cyan('═'.repeat(80)) + '\n');
}

function printSubHeader(title) {
  console.log('\n' + chalk.yellow('─'.repeat(80)));
  console.log(chalk.yellow.bold('  ' + title));
  console.log(chalk.yellow('─'.repeat(80)) + '\n');
}

function printSuccess(message) {
  console.log(chalk.green('✓ ') + message);
}

function printInfo(message) {
  console.log(chalk.blue('ℹ ') + message);
}

function printWarning(message) {
  console.log(chalk.yellow('⚠ ') + message);
}

function printError(message) {
  console.log(chalk.red('✗ ') + message);
}

function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatNumber(num) {
  return num.toLocaleString();
}

// ============================================================================
// DEMO MODULES
// ============================================================================

/**
 * Demo 1: Basic Setup and Initialization
 */
async function demoInitialization() {
  printHeader('DEMO 1: System Initialization');

  const spinner = ora('Initializing AI Knowledge Nexus...').start();

  try {
    const nexus = new KnowledgeNexus(DEMO_CONFIG);
    const result = await nexus.initialize();

    spinner.succeed('System initialized successfully!');

    // Display configuration
    const configTable = new Table({
      head: [chalk.cyan('Configuration'), chalk.cyan('Value')],
      style: { head: [], border: [] }
    });

    configTable.push(
      ['Vector Dimensions', result.config.vectorDimensions],
      ['Embedding Model', result.config.embeddingModel],
      ['Embedding Provider', result.config.embeddingProvider],
      ['Cache Enabled', result.config.enableCache ? '✓' : '✗'],
      ['Monitoring Enabled', result.config.enableMonitoring ? '✓' : '✗']
    );

    console.log(configTable.toString());

    // Display loaded modules
    const modulesTable = new Table({
      head: [chalk.cyan('Module'), chalk.cyan('Status')],
      style: { head: [], border: [] }
    });

    result.modules.forEach(module => {
      modulesTable.push([module, chalk.green('✓ Loaded')]);
    });

    console.log('\n' + modulesTable.toString());

    printSuccess(`Loaded ${result.modules.length} modules successfully`);

    return nexus;

  } catch (error) {
    spinner.fail('Initialization failed');
    printError(error.message);
    throw error;
  }
}

/**
 * Demo 2: Document Indexing
 */
async function demoDocumentIndexing(nexus) {
  printHeader('DEMO 2: Document Indexing');

  printInfo(`Indexing ${SAMPLE_DOCUMENTS.length} sample documents...`);

  const progressBar = ora('Processing documents...').start();
  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < SAMPLE_DOCUMENTS.length; i++) {
    const doc = SAMPLE_DOCUMENTS[i];
    progressBar.text = `Processing document ${i + 1}/${SAMPLE_DOCUMENTS.length}...`;

    try {
      const result = await nexus.addDocument(doc.content, doc.metadata);
      results.push(result);
    } catch (error) {
      printWarning(`Failed to index document ${i + 1}: ${error.message}`);
    }
  }

  const totalTime = Date.now() - startTime;
  progressBar.succeed(`Indexed ${results.length} documents in ${formatTime(totalTime)}`);

  // Display statistics
  const statsTable = new Table({
    head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    style: { head: [], border: [] }
  });

  const avgTime = totalTime / results.length;
  const throughput = (results.length / (totalTime / 1000)).toFixed(2);

  statsTable.push(
    ['Total Documents', results.length],
    ['Total Time', formatTime(totalTime)],
    ['Avg Time per Doc', formatTime(avgTime)],
    ['Throughput', `${throughput} docs/s`]
  );

  console.log('\n' + statsTable.toString());

  // Show sample embeddings info
  if (results[0]?.embedding) {
    printInfo(`Embedding dimension: ${results[0].embedding.length}`);
    printInfo(`Sample embedding (first 5 values): [${results[0].embedding.slice(0, 5).map(v => v.toFixed(3)).join(', ')}...]`);
  }

  printSuccess('Document indexing complete!');
}

/**
 * Demo 3: Vector Search
 */
async function demoVectorSearch(nexus) {
  printHeader('DEMO 3: Vector Search');

  const queries = [
    'What is machine learning?',
    'How do neural networks work?',
    'Tell me about NLP',
    'Vector databases and embeddings'
  ];

  for (const query of queries) {
    printSubHeader(`Query: "${query}"`);

    const spinner = ora('Searching...').start();
    const startTime = Date.now();

    try {
      const result = await nexus.search(query, {
        k: 3,
        strategy: 'vector',
        threshold: 0.5
      });

      const searchTime = Date.now() - startTime;
      spinner.succeed(`Found ${result.count} results in ${formatTime(searchTime)}`);

      // Display results
      result.results.forEach((r, idx) => {
        console.log(chalk.cyan(`\n${idx + 1}. Score: ${(r.similarity || r.score).toFixed(4)}`));
        console.log(chalk.white(`   ${r.metadata.content.substring(0, 120)}...`));
        console.log(chalk.gray(`   Category: ${r.metadata.category} | Tags: ${r.metadata.tags.join(', ')}`));
      });

    } catch (error) {
      spinner.fail('Search failed');
      printError(error.message);
    }
  }

  printSuccess('Vector search demo complete!');
}

/**
 * Demo 4: Hybrid Search
 */
async function demoHybridSearch(nexus) {
  printHeader('DEMO 4: Hybrid Search (Vector + Keyword)');

  const queries = [
    'AI and machine learning',
    'deep neural networks',
    'semantic search with vectors'
  ];

  for (const query of queries) {
    printSubHeader(`Query: "${query}"`);

    const spinner = ora('Performing hybrid search...').start();

    try {
      const result = await nexus.search(query, {
        k: 5,
        strategy: 'hybrid',
        threshold: 0.3,
        enableReranking: true
      });

      spinner.succeed(`Found ${result.count} results (strategy: ${result.strategy})`);

      // Create results table
      const resultsTable = new Table({
        head: [chalk.cyan('#'), chalk.cyan('Score'), chalk.cyan('Source'), chalk.cyan('Content')],
        colWidths: [5, 10, 10, 55],
        style: { head: [], border: [] }
      });

      result.results.forEach((r, idx) => {
        resultsTable.push([
          idx + 1,
          (r.similarity || r.score).toFixed(4),
          r.source || 'N/A',
          r.metadata.content.substring(0, 50) + '...'
        ]);
      });

      console.log('\n' + resultsTable.toString());

      printInfo(`Processing time: ${formatTime(result.processingTime)}`);

    } catch (error) {
      spinner.fail('Search failed');
      printError(error.message);
    }
  }

  printSuccess('Hybrid search demo complete!');
}

/**
 * Demo 5: System Statistics
 */
async function demoStatistics(nexus) {
  printHeader('DEMO 5: System Statistics');

  const spinner = ora('Gathering statistics...').start();

  try {
    const stats = nexus.getStats();
    spinner.succeed('Statistics collected');

    // Vector Engine Stats
    if (stats.vectorEngine) {
      printSubHeader('Vector Engine Statistics');

      const vectorTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        style: { head: [], border: [] }
      });

      vectorTable.push(
        ['Total Vectors', formatNumber(stats.vectorEngine.insertions || 0)],
        ['Total Searches', formatNumber(stats.vectorEngine.searches || 0)],
        ['Cache Hits', formatNumber(stats.vectorEngine.cacheHits || 0)],
        ['Cache Misses', formatNumber(stats.vectorEngine.cacheMisses || 0)],
        ['Avg Search Time', stats.vectorEngine.searches > 0
          ? formatTime((stats.vectorEngine.totalSearchTime || 0) / stats.vectorEngine.searches)
          : 'N/A']
      );

      console.log(vectorTable.toString());
    }

    // Search Engine Stats
    if (stats.searchEngine) {
      printSubHeader('Search Engine Statistics');

      const searchTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        style: { head: [], border: [] }
      });

      searchTable.push(
        ['Documents Indexed', formatNumber(stats.searchEngine.documents || 0)],
        ['Terms in Index', formatNumber(stats.searchEngine.terms || 0)],
        ['Facets', formatNumber(stats.searchEngine.facets || 0)],
        ['Graph Nodes', formatNumber(stats.searchEngine.graphNodes || 0)],
        ['Graph Edges', formatNumber(stats.searchEngine.graphEdges || 0)]
      );

      console.log(searchTable.toString());
    }

    // Performance Stats
    if (stats.performance && stats.performance.summary) {
      printSubHeader('Performance Metrics');

      const perfTable = new Table({
        head: [chalk.cyan('Metric'), chalk.cyan('Value')],
        style: { head: [], border: [] }
      });

      const perf = stats.performance.summary;

      perfTable.push(
        ['Total Queries', formatNumber(perf.totalQueries || 0)],
        ['Avg Query Latency', formatTime(perf.avgQueryLatency || 0)],
        ['Cache Hit Rate', `${(perf.cacheHitRate || 0).toFixed(2)}%`],
        ['Heap Used', perf.currentMemoryUsage
          ? `${(perf.currentMemoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`
          : 'N/A'],
        ['Uptime', perf.uptime ? `${(perf.uptime / 1000).toFixed(2)}s` : 'N/A']
      );

      console.log(perfTable.toString());
    }

    printSuccess('Statistics displayed successfully!');

  } catch (error) {
    spinner.fail('Failed to gather statistics');
    printError(error.message);
  }
}

/**
 * Demo 6: Performance Benchmark
 */
async function demoBenchmark(nexus) {
  printHeader('DEMO 6: Performance Benchmark');

  printInfo('Running performance benchmarks...');

  const spinner = ora('Benchmarking document addition...').start();

  try {
    const results = await nexus.benchmark({
      iterations: 10,
      warmup: 2
    });

    spinner.succeed('Benchmark complete');

    // Display results
    const benchTable = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Value')],
      style: { head: [], border: [] }
    });

    if (results.metrics) {
      benchTable.push(
        ['Total Iterations', results.iterations || 10],
        ['Avg Latency', formatTime(results.metrics.avgLatency || 0)],
        ['Min Latency', formatTime(results.metrics.minLatency || 0)],
        ['Max Latency', formatTime(results.metrics.maxLatency || 0)],
        ['p50 Latency', formatTime(results.metrics.p50 || 0)],
        ['p95 Latency', formatTime(results.metrics.p95 || 0)],
        ['p99 Latency', formatTime(results.metrics.p99 || 0)],
        ['Throughput', `${(results.metrics.throughput || 0).toFixed(2)} ops/s`]
      );
    }

    console.log('\n' + benchTable.toString());

    printSuccess('Benchmark complete!');

  } catch (error) {
    spinner.fail('Benchmark failed');
    printError(error.message);
  }
}

/**
 * Demo 7: Interactive Features
 */
async function demoInteractive(nexus) {
  printHeader('DEMO 7: Interactive Search');

  let continueSearching = true;

  while (continueSearching) {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Enter your search query (or "exit" to continue):',
        default: 'What is AI?'
      }
    ]);

    if (query.toLowerCase() === 'exit') {
      continueSearching = false;
      continue;
    }

    const { strategy } = await inquirer.prompt([
      {
        type: 'list',
        name: 'strategy',
        message: 'Select search strategy:',
        choices: ['vector', 'keyword', 'hybrid'],
        default: 'hybrid'
      }
    ]);

    const spinner = ora('Searching...').start();

    try {
      const result = await nexus.search(query, {
        k: 5,
        strategy,
        threshold: 0.3
      });

      spinner.succeed(`Found ${result.count} results`);

      // Display results
      result.results.forEach((r, idx) => {
        console.log(chalk.cyan(`\n${idx + 1}. Score: ${(r.similarity || r.score).toFixed(4)}`));
        console.log(chalk.white(`   ${r.metadata.content}`));
        console.log(chalk.gray(`   Category: ${r.metadata.category} | Tags: ${r.metadata.tags.join(', ')}`));
      });

      printInfo(`Search completed in ${formatTime(result.processingTime)}`);

    } catch (error) {
      spinner.fail('Search failed');
      printError(error.message);
    }

    const { continuePrompt } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continuePrompt',
        message: 'Search again?',
        default: false
      }
    ]);

    continueSearching = continuePrompt;
  }

  printSuccess('Interactive search demo complete!');
}

// ============================================================================
// MAIN DEMO RUNNER
// ============================================================================

async function runFullDemo() {
  console.clear();

  // Display banner
  console.log(gradient.pastel(figlet.textSync('AI Knowledge Nexus', {
    font: 'Standard',
    horizontalLayout: 'default'
  })));

  console.log(boxen(
    chalk.white.bold('Comprehensive Feature Demonstration\n\n') +
    chalk.gray('This demo showcases all features of the AI Knowledge Nexus system:\n') +
    chalk.cyan('• Vector Search & Embeddings\n') +
    chalk.cyan('• Hybrid Search Strategies\n') +
    chalk.cyan('• Performance Monitoring\n') +
    chalk.cyan('• System Statistics\n') +
    chalk.cyan('• Interactive Search'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }
  ));

  let nexus;

  try {
    // Run all demos
    nexus = await demoInitialization();
    await demoDocumentIndexing(nexus);
    await demoVectorSearch(nexus);
    await demoHybridSearch(nexus);
    await demoStatistics(nexus);
    await demoBenchmark(nexus);

    // Ask if user wants interactive demo
    const { runInteractive } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'runInteractive',
        message: 'Run interactive search demo?',
        default: true
      }
    ]);

    if (runInteractive) {
      await demoInteractive(nexus);
    }

    // Final summary
    printHeader('DEMO COMPLETE!');

    console.log(boxen(
      chalk.green.bold('✓ All demos completed successfully!\n\n') +
      chalk.white('Next steps:\n') +
      chalk.cyan('• Try the interactive CLI: npm run cli\n') +
      chalk.cyan('• Read the documentation: cat README.md\n') +
      chalk.cyan('• Run benchmarks: npm run bench\n') +
      chalk.cyan('• Explore the code: /src/index.js'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));

  } catch (error) {
    printError('Demo failed: ' + error.message);
    console.error(error);
  } finally {
    if (nexus) {
      const spinner = ora('Shutting down...').start();
      await nexus.shutdown();
      spinner.succeed('System shutdown complete');
    }
  }
}

// ============================================================================
// CLI ARGUMENT HANDLING
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--full') {
    await runFullDemo();
  } else if (command === '--help' || command === '-h') {
    console.log(chalk.cyan.bold('\nAI Knowledge Nexus - Demo Script\n'));
    console.log(chalk.white('Usage:'));
    console.log('  npm run demo              Run full demo');
    console.log('  npm run demo -- --help    Show this help');
    console.log('\nIndividual demos:');
    console.log('  npm run demo:performance  Performance benchmarks only');
    console.log('  npm run demo:search       Search demos only');
    console.log('  npm run demo:rag          RAG demos only');
    console.log('  npm run demo:viz          Visualization demos only');
    console.log();
  } else {
    printWarning(`Unknown command: ${command}`);
    printInfo('Run with --help for usage information');
  }
}

// Run the demo
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

// Export for use as module
module.exports = {
  runFullDemo,
  demoInitialization,
  demoDocumentIndexing,
  demoVectorSearch,
  demoHybridSearch,
  demoStatistics,
  demoBenchmark,
  demoInteractive
};
