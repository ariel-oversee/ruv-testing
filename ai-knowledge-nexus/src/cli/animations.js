/**
 * CLI Animations Library
 *
 * Collection of beautiful animations and effects
 */

const chalk = require('chalk');
const gradient = require('gradient-string');
const logUpdate = require('log-update');
const ansiEscapes = require('ansi-escapes');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Typewriter effect
 * @param {string} text - Text to display
 * @param {number} speed - Typing speed in ms
 */
async function typewriter(text, speed = 50) {
  for (let i = 0; i < text.length; i++) {
    process.stdout.write(text[i]);
    await sleep(speed);
  }
  process.stdout.write('\n');
}

/**
 * Progress wave animation
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms
 */
async function progressWave(message = 'Loading', duration = 3000) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const colors = [
    chalk.cyan,
    chalk.blue,
    chalk.magenta,
    chalk.red,
    chalk.yellow,
    chalk.green
  ];

  const endTime = Date.now() + duration;
  let i = 0;

  while (Date.now() < endTime) {
    const frame = frames[i % frames.length];
    const color = colors[Math.floor(i / frames.length) % colors.length];
    logUpdate(color(`${frame} ${message}...`));
    await sleep(80);
    i++;
  }

  logUpdate.clear();
}

/**
 * Rainbow wave text animation
 * @param {string} text - Text to animate
 * @param {number} iterations - Number of iterations
 */
async function rainbowWave(text, iterations = 10) {
  const colors = [
    chalk.red,
    chalk.yellow,
    chalk.green,
    chalk.cyan,
    chalk.blue,
    chalk.magenta
  ];

  for (let i = 0; i < iterations; i++) {
    const colored = text
      .split('')
      .map((char, index) => {
        const colorIndex = (index + i) % colors.length;
        return colors[colorIndex](char);
      })
      .join('');

    logUpdate(colored);
    await sleep(100);
  }

  logUpdate.clear();
  console.log(gradient.rainbow(text));
}

/**
 * Matrix rain effect
 * @param {number} duration - Duration in ms
 */
async function matrixRain(duration = 5000) {
  const width = process.stdout.columns;
  const height = process.stdout.rows - 2;
  const chars = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01';

  const columns = Array(width).fill(0);
  const endTime = Date.now() + duration;

  console.log(ansiEscapes.clearScreen);

  while (Date.now() < endTime) {
    let output = '';

    for (let i = 0; i < width; i++) {
      if (Math.random() > 0.975) {
        columns[i] = 0;
      }

      if (columns[i] < height) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const intensity = 1 - columns[i] / height;
        const green = Math.floor(255 * intensity);

        output += `\x1b[38;2;0;${green};0m${char}\x1b[0m`;
        columns[i]++;
      } else {
        output += ' ';
      }
    }

    process.stdout.write(ansiEscapes.cursorTo(0, 0) + output);
    await sleep(50);
  }

  console.log(ansiEscapes.clearScreen);
}

/**
 * Pulse animation
 * @param {string} text - Text to pulse
 * @param {number} iterations - Number of pulses
 */
async function pulse(text, iterations = 5) {
  const intensities = [0.2, 0.4, 0.6, 0.8, 1.0, 0.8, 0.6, 0.4, 0.2];

  for (let i = 0; i < iterations; i++) {
    for (const intensity of intensities) {
      const alpha = Math.floor(255 * intensity);
      logUpdate(chalk.hex(`#00${alpha.toString(16).padStart(2, '0')}FF`)(text));
      await sleep(50);
    }
  }

  logUpdate.clear();
  console.log(chalk.cyan(text));
}

/**
 * Glitch effect
 * @param {string} text - Text to glitch
 * @param {number} duration - Duration in ms
 */
async function glitch(text, duration = 2000) {
  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
  const endTime = Date.now() + duration;

  while (Date.now() < endTime) {
    const glitched = text
      .split('')
      .map(char => {
        if (Math.random() > 0.9) {
          return chalk.red(glitchChars[Math.floor(Math.random() * glitchChars.length)]);
        }
        if (Math.random() > 0.95) {
          return chalk.blue(char.toUpperCase());
        }
        return chalk.white(char);
      })
      .join('');

    logUpdate(glitched);
    await sleep(50);
  }

  logUpdate.clear();
  console.log(chalk.white(text));
}

/**
 * Bouncing ball animation
 * @param {number} duration - Duration in ms
 */
async function bouncingBall(duration = 3000) {
  const width = 40;
  const ball = '●';
  const endTime = Date.now() + duration;
  let position = 0;
  let direction = 1;

  while (Date.now() < endTime) {
    const padding = ' '.repeat(position);
    const color = gradient.rainbow(ball);
    logUpdate(padding + color);

    position += direction;
    if (position >= width || position <= 0) {
      direction *= -1;
    }

    await sleep(30);
  }

  logUpdate.clear();
}

/**
 * Loading bar animation
 * @param {string} message - Loading message
 * @param {number} duration - Duration in ms
 */
async function loadingBar(message = 'Loading', duration = 3000) {
  const width = 40;
  const startTime = Date.now();
  const endTime = startTime + duration;

  while (Date.now() < endTime) {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / duration);
    const filled = Math.floor(width * progress);
    const empty = width - filled;

    const bar =
      chalk.cyan('█'.repeat(filled)) +
      chalk.gray('░'.repeat(empty));

    const percentage = Math.floor(progress * 100);
    logUpdate(`${message} [${bar}] ${percentage}%`);

    await sleep(50);
  }

  logUpdate.clear();
  console.log(chalk.green(`✓ ${message} complete!`));
}

/**
 * Confetti effect
 * @param {number} duration - Duration in ms
 */
async function confetti(duration = 2000) {
  const symbols = ['*', '·', '•', '◦', '○', '●', '◉', '◎'];
  const colors = [
    chalk.red,
    chalk.yellow,
    chalk.green,
    chalk.cyan,
    chalk.blue,
    chalk.magenta
  ];
  const width = process.stdout.columns;
  const height = 10;
  const endTime = Date.now() + duration;

  while (Date.now() < endTime) {
    let output = '';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.random() > 0.85) {
          const symbol = symbols[Math.floor(Math.random() * symbols.length)];
          const color = colors[Math.floor(Math.random() * colors.length)];
          output += color(symbol);
        } else {
          output += ' ';
        }
      }
      output += '\n';
    }

    logUpdate(output);
    await sleep(100);
  }

  logUpdate.clear();
}

/**
 * Gradient slide animation
 * @param {string} text - Text to animate
 * @param {number} iterations - Number of iterations
 */
async function gradientSlide(text, iterations = 20) {
  const colors = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];

  for (let i = 0; i < iterations; i++) {
    const startIndex = i % colors.length;
    const endIndex = (i + 2) % colors.length;
    const grad = gradient(colors[startIndex], colors[endIndex]);

    logUpdate(grad(text));
    await sleep(100);
  }

  logUpdate.clear();
  console.log(gradient.rainbow(text));
}

module.exports = {
  typewriter,
  progressWave,
  rainbowWave,
  matrixRain,
  pulse,
  glitch,
  bouncingBall,
  loadingBar,
  confetti,
  gradientSlide
};
