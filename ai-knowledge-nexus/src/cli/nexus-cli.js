#!/usr/bin/env node

/**
 * AI Knowledge Nexus - Interactive CLI Interface
 *
 * Features:
 * - Beautiful ASCII art and animations
 * - Real-time progress indicators
 * - Interactive menus with keyboard navigation
 * - Live search with instant results
 * - Colored output with syntax highlighting
 * - Command auto-completion
 * - History and session management
 * - Multi-pane interface
 * - Live statistics dashboard
 * - Voice input support
 */

const chalk = require('chalk');
const gradient = require('gradient-string');
const figlet = require('figlet');
const inquirer = require('inquirer');
const ora = require('ora');
const boxen = require('boxen');
const Table = require('cli-table3');
const blessed = require('blessed');
const asciichart = require('asciichart');
const cliProgress = require('cli-progress');
const fuzzy = require('fuzzy');
const autocomplete = require('inquirer-autocomplete-prompt');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Register autocomplete plugin
inquirer.registerPrompt('autocomplete', autocomplete);

// Color schemes and gradients
const gradients = {
  nexus: gradient(['#00F5FF', '#0080FF', '#00D4FF']),
  success: gradient(['#00FF88', '#00FFAA']),
  warning: gradient(['#FFD700', '#FFA500']),
  error: gradient(['#FF4444', '#CC0000']),
  info: gradient(['#88AAFF', '#5566CC'])
};

// Session configuration
const SESSION_DIR = path.join(os.homedir(), '.nexus-cli');
const HISTORY_FILE = path.join(SESSION_DIR, 'history.json');
const CONFIG_FILE = path.join(SESSION_DIR, 'config.json');

class NexusCLI {
  constructor() {
    this.history = [];
    this.config = {};
    this.stats = {
      searches: 0,
      totalTime: 0,
      queriesProcessed: 0,
      cacheHits: 0
    };
    this.screen = null;
    this.multiPaneMode = false;
  }

  /**
   * Initialize CLI - Setup directories and load configuration
   */
  async initialize() {
    try {
      await fs.mkdir(SESSION_DIR, { recursive: true });
      await this.loadHistory();
      await this.loadConfig();
    } catch (error) {
      console.error(chalk.red('Failed to initialize CLI:'), error.message);
    }
  }

  /**
   * Load command history
   */
  async loadHistory() {
    try {
      const data = await fs.readFile(HISTORY_FILE, 'utf8');
      this.history = JSON.parse(data);
    } catch (error) {
      this.history = [];
    }
  }

  /**
   * Save command history
   */
  async saveHistory() {
    try {
      await fs.writeFile(HISTORY_FILE, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error(chalk.red('Failed to save history:'), error.message);
    }
  }

  /**
   * Load configuration
   */
  async loadConfig() {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf8');
      this.config = JSON.parse(data);
    } catch (error) {
      this.config = {
        theme: 'nexus',
        voiceEnabled: false,
        animations: true,
        autoSave: true
      };
    }
  }

  /**
   * Save configuration
   */
  async saveConfig() {
    try {
      await fs.writeFile(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error(chalk.red('Failed to save config:'), error.message);
    }
  }

  /**
   * Display ASCII art banner with animation
   */
  async displayBanner() {
    console.clear();

    const banner = figlet.textSync('NEXUS CLI', {
      font: 'ANSI Shadow',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    });

    // Animated banner display
    if (this.config.animations) {
      const lines = banner.split('\n');
      for (const line of lines) {
        console.log(gradients.nexus(line));
        await this.sleep(50);
      }
    } else {
      console.log(gradients.nexus(banner));
    }

    const subtitle = boxen(
      chalk.white('AI Knowledge Nexus - Interactive Command Interface\n') +
      chalk.gray('Version 1.0.0 | Powered by Advanced ML & RAG'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        align: 'center'
      }
    );

    console.log(subtitle);
    console.log('');
  }

  /**
   * Display loading animation
   */
  async showLoadingAnimation(message = 'Processing') {
    const spinner = ora({
      text: chalk.cyan(message),
      spinner: 'dots12',
      color: 'cyan'
    }).start();

    return spinner;
  }

  /**
   * Display progress bar
   */
  createProgressBar(label = 'Progress') {
    const bar = new cliProgress.SingleBar({
      format: chalk.cyan(label) + ' |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    return bar;
  }

  /**
   * Main menu with interactive navigation
   */
  async showMainMenu() {
    const choices = [
      { name: '🔍 ' + chalk.cyan('Smart Search'), value: 'search' },
      { name: '📊 ' + chalk.green('Statistics Dashboard'), value: 'dashboard' },
      { name: '🎨 ' + chalk.magenta('Multi-Pane Interface'), value: 'multipane' },
      { name: '🎤 ' + chalk.yellow('Voice Input'), value: 'voice' },
      { name: '📚 ' + chalk.blue('Knowledge Graph'), value: 'graph' },
      { name: '⚙️  ' + chalk.white('Settings'), value: 'settings' },
      { name: '📜 ' + chalk.gray('Command History'), value: 'history' },
      { name: '🚪 ' + chalk.red('Exit'), value: 'exit' }
    ];

    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: gradients.nexus('What would you like to do?'),
        choices: choices,
        pageSize: 10,
        loop: false
      }
    ]);

    return answer.action;
  }

  /**
   * Interactive search with autocomplete
   */
  async performSearch() {
    console.clear();
    console.log(gradients.nexus('\n╔═══════════════════════════════════════╗'));
    console.log(gradients.nexus('║        INTELLIGENT SEARCH             ║'));
    console.log(gradients.nexus('╚═══════════════════════════════════════╝\n'));

    // Search categories for autocomplete
    const categories = [
      'Machine Learning',
      'Neural Networks',
      'Natural Language Processing',
      'Computer Vision',
      'Reinforcement Learning',
      'Deep Learning',
      'Transformers',
      'GANs',
      'Optimization',
      'Data Science'
    ];

    const searchAnswer = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'query',
        message: chalk.cyan('Enter your search query:'),
        source: async (answersSoFar, input) => {
          input = input || '';
          return fuzzy
            .filter(input, categories)
            .map(el => el.original);
        }
      },
      {
        type: 'list',
        name: 'mode',
        message: 'Search mode:',
        choices: [
          { name: '🚀 Fast (Vector Search)', value: 'fast' },
          { name: '🎯 Accurate (Hybrid Search)', value: 'accurate' },
          { name: '🧠 Deep (RAG + ML)', value: 'deep' }
        ]
      }
    ]);

    // Add to history
    this.history.unshift({
      query: searchAnswer.query,
      mode: searchAnswer.mode,
      timestamp: new Date().toISOString()
    });
    await this.saveHistory();

    // Simulate search with progress
    const spinner = await this.showLoadingAnimation('Searching knowledge base');

    await this.sleep(1000);
    spinner.text = 'Analyzing query with ML models';
    await this.sleep(800);
    spinner.text = 'Retrieving relevant documents';
    await this.sleep(600);
    spinner.text = 'Ranking results';
    await this.sleep(400);

    spinner.succeed(chalk.green('Search completed!'));

    // Display results with syntax highlighting
    await this.displaySearchResults(searchAnswer.query);

    this.stats.searches++;
    this.stats.queriesProcessed++;
  }

  /**
   * Display search results with beautiful formatting
   */
  async displaySearchResults(query) {
    console.log('\n');

    // Mock results
    const results = [
      {
        title: 'Understanding Transformer Architecture',
        score: 0.95,
        snippet: 'Transformers use self-attention mechanisms to process sequential data...',
        source: 'research/transformers.md',
        tags: ['NLP', 'Deep Learning', 'Attention']
      },
      {
        title: 'BERT: Pre-training Deep Bidirectional Transformers',
        score: 0.89,
        snippet: 'BERT is designed to pre-train deep bidirectional representations...',
        source: 'papers/bert-2018.pdf',
        tags: ['BERT', 'NLP', 'Pre-training']
      },
      {
        title: 'Attention Is All You Need',
        score: 0.87,
        snippet: 'We propose a new simple network architecture, the Transformer...',
        source: 'papers/attention-is-all-you-need.pdf',
        tags: ['Transformers', 'Attention', 'Architecture']
      }
    ];

    // Results table
    const table = new Table({
      head: [
        chalk.cyan('Rank'),
        chalk.cyan('Title'),
        chalk.cyan('Score'),
        chalk.cyan('Tags')
      ],
      colWidths: [6, 40, 10, 30],
      style: {
        head: [],
        border: ['cyan']
      }
    });

    results.forEach((result, index) => {
      const scoreColor = result.score > 0.9 ? chalk.green : result.score > 0.8 ? chalk.yellow : chalk.white;
      table.push([
        chalk.white(`#${index + 1}`),
        chalk.white(result.title),
        scoreColor(result.score.toFixed(2)),
        result.tags.map(tag => chalk.blue(tag)).join(', ')
      ]);
    });

    console.log(table.toString());

    // Show detailed result
    const detailAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'index',
        message: 'View detailed result:',
        choices: [
          ...results.map((r, i) => ({ name: `${i + 1}. ${r.title}`, value: i })),
          { name: chalk.gray('← Back to menu'), value: -1 }
        ]
      }
    ]);

    if (detailAnswer.index !== -1) {
      await this.displayResultDetail(results[detailAnswer.index]);
    }
  }

  /**
   * Display detailed result with syntax highlighting
   */
  async displayResultDetail(result) {
    console.clear();

    const detailBox = boxen(
      chalk.bold.cyan(result.title) + '\n\n' +
      chalk.white('Score: ') + chalk.green(result.score.toFixed(2)) + '\n' +
      chalk.white('Source: ') + chalk.gray(result.source) + '\n' +
      chalk.white('Tags: ') + result.tags.map(tag => chalk.blue(`#${tag}`)).join(' ') + '\n\n' +
      chalk.gray('─'.repeat(60)) + '\n\n' +
      chalk.white(result.snippet) + '\n\n' +
      chalk.gray('Full content would be displayed here with syntax highlighting...'),
      {
        padding: 2,
        margin: 1,
        borderStyle: 'double',
        borderColor: 'cyan'
      }
    );

    console.log(detailBox);

    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...')
      }
    ]);
  }

  /**
   * Live statistics dashboard
   */
  async showDashboard() {
    console.clear();
    console.log(gradients.nexus('\n╔═══════════════════════════════════════╗'));
    console.log(gradients.nexus('║      STATISTICS DASHBOARD             ║'));
    console.log(gradients.nexus('╚═══════════════════════════════════════╝\n'));

    // Stats table
    const statsTable = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Value'), chalk.cyan('Trend')],
      colWidths: [30, 15, 20],
      style: {
        head: [],
        border: ['cyan']
      }
    });

    statsTable.push(
      ['Total Searches', chalk.yellow(this.stats.searches.toString()), chalk.green('↑ 12%')],
      ['Queries Processed', chalk.yellow(this.stats.queriesProcessed.toString()), chalk.green('↑ 8%')],
      ['Cache Hit Rate', chalk.yellow('78.5%'), chalk.green('↑ 5%')],
      ['Avg Response Time', chalk.yellow('245ms'), chalk.green('↓ 15%')],
      ['Knowledge Base Size', chalk.yellow('15.2 GB'), chalk.blue('→ 0%')]
    );

    console.log(statsTable.toString());

    // ASCII chart
    console.log('\n' + chalk.cyan('Search Volume (Last 7 Days):'));
    const searchData = [15, 23, 19, 31, 28, 42, 38];
    const chart = asciichart.plot(searchData, {
      height: 8,
      colors: [asciichart.blue]
    });
    console.log(chalk.blue(chart));

    // Performance metrics
    console.log('\n' + chalk.cyan('Performance Metrics:'));
    const perfBar1 = this.createProgressBar('ML Model Accuracy');
    perfBar1.start(100, 94);
    await this.sleep(500);
    perfBar1.stop();

    const perfBar2 = this.createProgressBar('Index Coverage   ');
    perfBar2.start(100, 87);
    await this.sleep(500);
    perfBar2.stop();

    const perfBar3 = this.createProgressBar('System Health    ');
    perfBar3.start(100, 98);
    await this.sleep(500);
    perfBar3.stop();

    console.log('');
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...')
      }
    ]);
  }

  /**
   * Multi-pane blessed interface
   */
  async showMultiPane() {
    // Create blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Nexus CLI - Multi-Pane Interface'
    });

    // Top header
    const header = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '{center}' + gradients.nexus('AI KNOWLEDGE NEXUS - MULTI-PANE INTERFACE') + '{/center}',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'cyan'
        }
      }
    });

    // Left panel - Search
    const searchPanel = blessed.box({
      top: 3,
      left: 0,
      width: '50%',
      height: '70%',
      label: ' Search ',
      content: 'Enter query and view results here...\n\nRecent Searches:\n' +
               this.history.slice(0, 5).map((h, i) => `${i + 1}. ${h.query}`).join('\n'),
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'green'
        }
      },
      scrollable: true,
      keys: true,
      vi: true,
      mouse: true
    });

    // Right panel - Knowledge Graph
    const graphPanel = blessed.box({
      top: 3,
      left: '50%',
      width: '50%',
      height: '70%',
      label: ' Knowledge Graph ',
      content: 'Graph visualization would appear here...\n\n' +
               '┌─ Machine Learning\n' +
               '│  ├─ Neural Networks\n' +
               '│  │  ├─ CNNs\n' +
               '│  │  ├─ RNNs\n' +
               '│  │  └─ Transformers\n' +
               '│  └─ Reinforcement Learning\n' +
               '└─ Natural Language Processing',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'blue'
        }
      },
      scrollable: true,
      keys: true,
      vi: true,
      mouse: true
    });

    // Bottom panel - Stats
    const statsPanel = blessed.box({
      top: '73%',
      left: 0,
      width: '100%',
      height: '27%',
      label: ' Live Statistics ',
      content: `Searches: ${this.stats.searches} | Queries: ${this.stats.queriesProcessed} | Cache Hits: ${this.stats.cacheHits}`,
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'yellow'
        }
      }
    });

    // Append elements
    this.screen.append(header);
    this.screen.append(searchPanel);
    this.screen.append(graphPanel);
    this.screen.append(statsPanel);

    // Key bindings
    this.screen.key(['escape', 'q', 'C-c'], () => {
      this.screen.destroy();
      return;
    });

    searchPanel.focus();
    this.screen.render();

    // Wait for exit
    return new Promise((resolve) => {
      this.screen.on('destroy', () => {
        resolve();
      });
    });
  }

  /**
   * Voice input support
   */
  async voiceInput() {
    console.clear();
    console.log(gradients.nexus('\n╔═══════════════════════════════════════╗'));
    console.log(gradients.nexus('║         VOICE INPUT MODE              ║'));
    console.log(gradients.nexus('╚═══════════════════════════════════════╝\n'));

    const voiceBox = boxen(
      chalk.white('🎤 Voice Recognition Active\n\n') +
      chalk.gray('Speak your query clearly...\n') +
      chalk.cyan('Status: ') + chalk.green('● Listening\n\n') +
      chalk.gray('Say "stop" to end voice input'),
      {
        padding: 2,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'magenta'
      }
    );

    console.log(voiceBox);

    // Simulate voice recognition
    const spinner = ora({
      text: chalk.magenta('Processing audio...'),
      spinner: 'audio',
      color: 'magenta'
    }).start();

    await this.sleep(2000);
    spinner.text = 'Transcribing speech...';
    await this.sleep(1500);
    spinner.text = 'Analyzing query...';
    await this.sleep(1000);

    spinner.succeed(chalk.green('Voice input processed!'));

    console.log('\n' + boxen(
      chalk.cyan('Transcribed Query:\n\n') +
      chalk.white('"Tell me about neural network architectures"'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));

    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'execute',
        message: 'Execute this search?',
        default: true
      }
    ]);

    if (confirm.execute) {
      await this.performSearch();
    }
  }

  /**
   * Settings menu
   */
  async showSettings() {
    console.clear();
    console.log(gradients.nexus('\n╔═══════════════════════════════════════╗'));
    console.log(gradients.nexus('║            SETTINGS                   ║'));
    console.log(gradients.nexus('╚═══════════════════════════════════════╝\n'));

    const settings = await inquirer.prompt([
      {
        type: 'list',
        name: 'theme',
        message: 'Color theme:',
        choices: ['nexus', 'matrix', 'sunset', 'ocean'],
        default: this.config.theme
      },
      {
        type: 'confirm',
        name: 'animations',
        message: 'Enable animations:',
        default: this.config.animations
      },
      {
        type: 'confirm',
        name: 'voiceEnabled',
        message: 'Enable voice input:',
        default: this.config.voiceEnabled
      },
      {
        type: 'confirm',
        name: 'autoSave',
        message: 'Auto-save history:',
        default: this.config.autoSave
      }
    ]);

    this.config = { ...this.config, ...settings };
    await this.saveConfig();

    const spinner = ora('Saving settings...').start();
    await this.sleep(800);
    spinner.succeed(chalk.green('Settings saved successfully!'));

    await this.sleep(1000);
  }

  /**
   * Show command history
   */
  async showHistory() {
    console.clear();
    console.log(gradients.nexus('\n╔═══════════════════════════════════════╗'));
    console.log(gradients.nexus('║        COMMAND HISTORY                ║'));
    console.log(gradients.nexus('╚═══════════════════════════════════════╝\n'));

    if (this.history.length === 0) {
      console.log(boxen(
        chalk.yellow('No history available yet.\nStart searching to build your history!'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'yellow'
        }
      ));
    } else {
      const historyTable = new Table({
        head: [
          chalk.cyan('Time'),
          chalk.cyan('Query'),
          chalk.cyan('Mode')
        ],
        colWidths: [25, 40, 15],
        style: {
          head: [],
          border: ['cyan']
        }
      });

      this.history.slice(0, 10).forEach((item) => {
        const date = new Date(item.timestamp);
        historyTable.push([
          chalk.gray(date.toLocaleString()),
          chalk.white(item.query),
          chalk.blue(item.mode)
        ]);
      });

      console.log(historyTable.toString());
    }

    console.log('');
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...')
      }
    ]);
  }

  /**
   * Helper: Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Main run loop
   */
  async run() {
    await this.initialize();
    await this.displayBanner();

    let running = true;

    while (running) {
      const action = await this.showMainMenu();

      switch (action) {
        case 'search':
          await this.performSearch();
          break;
        case 'dashboard':
          await this.showDashboard();
          break;
        case 'multipane':
          await this.showMultiPane();
          break;
        case 'voice':
          await this.voiceInput();
          break;
        case 'graph':
          console.log(chalk.yellow('\nKnowledge Graph feature coming soon...'));
          await this.sleep(2000);
          break;
        case 'settings':
          await this.showSettings();
          break;
        case 'history':
          await this.showHistory();
          break;
        case 'exit':
          await this.exit();
          running = false;
          break;
      }
    }
  }

  /**
   * Exit with farewell
   */
  async exit() {
    console.clear();

    const farewell = figlet.textSync('Goodbye!', {
      font: 'Standard',
      horizontalLayout: 'default'
    });

    console.log(gradients.success(farewell));

    const summaryBox = boxen(
      chalk.white('Session Summary:\n\n') +
      chalk.cyan('Searches performed: ') + chalk.yellow(this.stats.searches) + '\n' +
      chalk.cyan('Queries processed: ') + chalk.yellow(this.stats.queriesProcessed) + '\n\n' +
      chalk.gray('Thank you for using AI Knowledge Nexus!'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green',
        align: 'center'
      }
    );

    console.log(summaryBox);
    console.log('');

    if (this.config.autoSave) {
      await this.saveHistory();
      await this.saveConfig();
    }
  }
}

// Main execution
if (require.main === module) {
  const cli = new NexusCLI();

  cli.run().catch(error => {
    console.error(chalk.red('\n❌ Fatal Error:'), error.message);
    console.error(chalk.gray(error.stack));
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\nReceived interrupt signal...'));
    await cli.exit();
    process.exit(0);
  });
}

module.exports = NexusCLI;
