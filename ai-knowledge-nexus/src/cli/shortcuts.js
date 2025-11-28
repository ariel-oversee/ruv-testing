/**
 * Keyboard Shortcuts Handler
 *
 * Manages keyboard shortcuts and input handling for the CLI
 */

const readline = require('readline');
const chalk = require('chalk');

class ShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = false;
    this.rl = null;
  }

  /**
   * Register a keyboard shortcut
   * @param {string} key - Key combination (e.g., 'ctrl+c', 'f1')
   * @param {function} callback - Function to call
   * @param {string} description - Description of the shortcut
   */
  register(key, callback, description = '') {
    this.shortcuts.set(key.toLowerCase(), {
      callback,
      description
    });
  }

  /**
   * Enable keyboard shortcuts
   */
  enable() {
    if (this.enabled) return;

    this.enabled = true;

    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);

      process.stdin.on('keypress', (str, key) => {
        this.handleKeypress(str, key);
      });
    }
  }

  /**
   * Disable keyboard shortcuts
   */
  disable() {
    if (!this.enabled) return;

    this.enabled = false;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.removeAllListeners('keypress');
    }
  }

  /**
   * Handle keypress events
   * @param {string} str - Key string
   * @param {object} key - Key object
   */
  handleKeypress(str, key) {
    if (!key) return;

    // Build key combination string
    let keyCombo = '';

    if (key.ctrl) keyCombo += 'ctrl+';
    if (key.meta) keyCombo += 'meta+';
    if (key.shift && key.name.length > 1) keyCombo += 'shift+';

    keyCombo += key.name.toLowerCase();

    // Look up and execute shortcut
    const shortcut = this.shortcuts.get(keyCombo);
    if (shortcut) {
      shortcut.callback(key);
    }
  }

  /**
   * Display all registered shortcuts
   */
  displayHelp() {
    console.log(chalk.bold.cyan('\nKeyboard Shortcuts:\n'));

    const shortcuts = Array.from(this.shortcuts.entries()).sort();

    shortcuts.forEach(([key, info]) => {
      const keyDisplay = chalk.yellow(key.toUpperCase().padEnd(20));
      const desc = chalk.gray(info.description);
      console.log(`  ${keyDisplay} ${desc}`);
    });

    console.log('');
  }

  /**
   * Clear all shortcuts
   */
  clear() {
    this.shortcuts.clear();
  }
}

/**
 * Pre-configured shortcuts for Nexus CLI
 */
const defaultShortcuts = {
  'ctrl+c': {
    description: 'Exit the application',
    callback: () => {
      console.log(chalk.yellow('\n\nReceived interrupt signal...'));
      process.exit(0);
    }
  },

  'ctrl+h': {
    description: 'Show help and shortcuts',
    callback: (manager) => {
      manager.displayHelp();
    }
  },

  'ctrl+r': {
    description: 'Refresh current view',
    callback: () => {
      console.clear();
      console.log(chalk.green('View refreshed!'));
    }
  },

  'ctrl+s': {
    description: 'Save current state',
    callback: () => {
      console.log(chalk.green('\n✓ State saved!'));
    }
  },

  'ctrl+f': {
    description: 'Focus search',
    callback: () => {
      console.log(chalk.cyan('\nSearch focused...'));
    }
  },

  'ctrl+d': {
    description: 'Show dashboard',
    callback: () => {
      console.log(chalk.cyan('\nOpening dashboard...'));
    }
  },

  'ctrl+g': {
    description: 'Show knowledge graph',
    callback: () => {
      console.log(chalk.cyan('\nOpening knowledge graph...'));
    }
  },

  'f1': {
    description: 'Help menu',
    callback: () => {
      console.log(chalk.cyan('\nOpening help menu...'));
    }
  },

  'f2': {
    description: 'Quick settings',
    callback: () => {
      console.log(chalk.cyan('\nOpening settings...'));
    }
  },

  'f3': {
    description: 'Toggle theme',
    callback: () => {
      console.log(chalk.magenta('\nSwitching theme...'));
    }
  },

  'f5': {
    description: 'Refresh data',
    callback: () => {
      console.log(chalk.green('\nRefreshing data...'));
    }
  },

  'esc': {
    description: 'Back/Cancel',
    callback: () => {
      console.log(chalk.gray('\nGoing back...'));
    }
  }
};

/**
 * Create and configure a shortcut manager with defaults
 * @returns {ShortcutManager} Configured manager
 */
function createDefaultManager() {
  const manager = new ShortcutManager();

  Object.entries(defaultShortcuts).forEach(([key, config]) => {
    manager.register(
      key,
      typeof config.callback === 'function' && config.callback.length > 0
        ? () => config.callback(manager)
        : config.callback,
      config.description
    );
  });

  return manager;
}

/**
 * Key code constants for common keys
 */
const KEY_CODES = {
  UP: '\u001b[A',
  DOWN: '\u001b[B',
  RIGHT: '\u001b[C',
  LEFT: '\u001b[D',
  ENTER: '\r',
  SPACE: ' ',
  ESCAPE: '\u001b',
  BACKSPACE: '\u007f',
  TAB: '\t',
  HOME: '\u001b[H',
  END: '\u001b[F',
  PAGE_UP: '\u001b[5~',
  PAGE_DOWN: '\u001b[6~',
  DELETE: '\u001b[3~',
  INSERT: '\u001b[2~'
};

/**
 * Check if a key matches a code
 * @param {object} key - Key object from keypress event
 * @param {string} code - Key code to check
 * @returns {boolean} True if match
 */
function isKey(key, code) {
  if (!key) return false;

  const codeMap = {
    up: 'UP',
    down: 'DOWN',
    right: 'RIGHT',
    left: 'LEFT',
    return: 'ENTER',
    enter: 'ENTER',
    space: 'SPACE',
    escape: 'ESCAPE',
    backspace: 'BACKSPACE',
    tab: 'TAB',
    home: 'HOME',
    end: 'END',
    pageup: 'PAGE_UP',
    pagedown: 'PAGE_DOWN',
    delete: 'DELETE',
    insert: 'INSERT'
  };

  const normalizedCode = code.toUpperCase();
  const keyName = key.name ? key.name.toLowerCase() : '';

  return codeMap[keyName] === normalizedCode || key.name === code;
}

/**
 * Wait for any key press
 * @param {string} message - Optional message to display
 * @returns {Promise} Resolves when key is pressed
 */
function waitForKey(message = 'Press any key to continue...') {
  return new Promise((resolve) => {
    console.log(chalk.gray(message));

    const onKeypress = (str, key) => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener('keypress', onKeypress);
      resolve(key);
    };

    readline.emitKeypressEvents(process.stdin);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.once('keypress', onKeypress);
  });
}

/**
 * Get single character input
 * @param {string} prompt - Prompt message
 * @param {array} validChars - Valid characters (optional)
 * @returns {Promise<string>} Character pressed
 */
async function getChar(prompt = '', validChars = null) {
  if (prompt) {
    process.stdout.write(prompt);
  }

  return new Promise((resolve) => {
    const onKeypress = (str, key) => {
      if (key.ctrl && key.name === 'c') {
        process.exit(0);
      }

      if (!validChars || validChars.includes(str)) {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('keypress', onKeypress);
        console.log('');
        resolve(str);
      }
    };

    readline.emitKeypressEvents(process.stdin);

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', onKeypress);
  });
}

module.exports = {
  ShortcutManager,
  defaultShortcuts,
  createDefaultManager,
  KEY_CODES,
  isKey,
  waitForKey,
  getChar
};
