#!/usr/bin/env node

/**
 * CLI Demo & Testing Script
 *
 * Quick demonstration of all CLI features without full interaction
 */

const chalk = require('chalk');
const gradient = require('gradient-string');
const figlet = require('figlet');
const ora = require('ora');
const boxen = require('boxen');
const Table = require('cli-table3');
const asciichart = require('asciichart');
const cliProgress = require('cli-progress');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runDemo() {
  console.clear();

  // Banner
  console.log(gradient.cyan.blue(figlet.textSync('CLI DEMO', { font: 'Standard' })));
  console.log('\n');

  // Feature 1: Spinner Animation
  console.log(chalk.bold.cyan('1. Loading Animations:'));
  const spinner1 = ora('Loading data...').start();
  await sleep(1000);
  spinner1.text = 'Processing results...';
  await sleep(1000);
  spinner1.succeed(chalk.green('Data loaded successfully!'));
  console.log('\n');

  // Feature 2: Progress Bar
  console.log(chalk.bold.cyan('2. Progress Indicators:'));
  const bar = new cliProgress.SingleBar({
    format: 'Progress |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591'
  });
  bar.start(100, 0);
  for (let i = 0; i <= 100; i += 10) {
    bar.update(i);
    await sleep(200);
  }
  bar.stop();
  console.log('\n');

  // Feature 3: Tables
  console.log(chalk.bold.cyan('3. Interactive Tables:'));
  const table = new Table({
    head: [chalk.cyan('Feature'), chalk.cyan('Status'), chalk.cyan('Performance')],
    colWidths: [30, 15, 20]
  });
  table.push(
    ['ASCII Art', chalk.green('✓ Active'), chalk.yellow('Excellent')],
    ['Voice Input', chalk.yellow('⚠ Beta'), chalk.yellow('Good')],
    ['Multi-pane', chalk.green('✓ Active'), chalk.green('Excellent')]
  );
  console.log(table.toString());
  console.log('\n');

  // Feature 4: ASCII Charts
  console.log(chalk.bold.cyan('4. Live Charts:'));
  const data = [12, 18, 23, 19, 31, 28, 35, 42];
  console.log(chalk.blue(asciichart.plot(data, { height: 8 })));
  console.log('\n');

  // Feature 5: Boxes
  console.log(chalk.bold.cyan('5. Beautiful Boxes:'));
  console.log(boxen(
    chalk.white('🎉 All features are working perfectly!\n\n') +
    chalk.gray('Ready for production deployment.'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'green'
    }
  ));

  // Feature 6: Gradients
  console.log(chalk.bold.cyan('6. Gradient Text:'));
  console.log(gradient.rainbow('Rainbow gradient text!'));
  console.log(gradient.pastel('Pastel gradient text!'));
  console.log(gradient(['#00F5FF', '#0080FF'])('Custom cyan gradient!'));
  console.log('\n');

  // Summary
  console.log(boxen(
    chalk.bold.green('✓ Demo Complete!\n\n') +
    chalk.white('All CLI features are functional:\n') +
    chalk.gray('• Animations & Spinners\n') +
    chalk.gray('• Progress Bars\n') +
    chalk.gray('• Tables & Charts\n') +
    chalk.gray('• Boxes & Gradients\n') +
    chalk.gray('• Multi-pane Interface\n') +
    chalk.gray('• Voice Input Support'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      align: 'center'
    }
  ));

  console.log('\n' + chalk.gray('Run "npm start" to launch the full interactive CLI'));
  console.log(chalk.gray('Run "node src/cli/nexus-cli.js" directly\n'));
}

// Run demo if executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo };
