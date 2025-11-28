/**
 * CLI Color Themes
 *
 * Pre-configured color schemes for the Nexus CLI
 */

const gradient = require('gradient-string');
const chalk = require('chalk');

// Theme definitions
const themes = {
  nexus: {
    name: 'Nexus',
    description: 'Modern tech-focused cyan/blue theme',
    primary: gradient(['#00F5FF', '#0080FF', '#00D4FF']),
    secondary: gradient(['#88AAFF', '#5566CC']),
    success: gradient(['#00FF88', '#00FFAA']),
    warning: gradient(['#FFD700', '#FFA500']),
    error: gradient(['#FF4444', '#CC0000']),
    info: gradient(['#88AAFF', '#5566CC']),
    text: chalk.white,
    muted: chalk.gray,
    highlight: chalk.cyan,
    border: 'cyan'
  },

  matrix: {
    name: 'Matrix',
    description: 'Classic green terminal theme',
    primary: gradient(['#00FF00', '#00CC00']),
    secondary: gradient(['#00AA00', '#008800']),
    success: gradient(['#00FF00', '#00DD00']),
    warning: gradient(['#FFFF00', '#DDDD00']),
    error: gradient(['#FF0000', '#CC0000']),
    info: gradient(['#00FF88', '#00DD77']),
    text: chalk.green,
    muted: chalk.gray,
    highlight: chalk.greenBright,
    border: 'green'
  },

  sunset: {
    name: 'Sunset',
    description: 'Warm orange/red gradient theme',
    primary: gradient(['#FF6B35', '#FF8C42', '#FFA552']),
    secondary: gradient(['#E63946', '#F77F00']),
    success: gradient(['#06FFA5', '#00CC88']),
    warning: gradient(['#FFD700', '#FFA500']),
    error: gradient(['#DC143C', '#B22222']),
    info: gradient(['#FF8C42', '#FF6B35']),
    text: chalk.white,
    muted: chalk.gray,
    highlight: chalk.yellow,
    border: 'yellow'
  },

  ocean: {
    name: 'Ocean',
    description: 'Cool blue/teal gradient theme',
    primary: gradient(['#00D9FF', '#00B8D4', '#0097A7']),
    secondary: gradient(['#4DD0E1', '#26C6DA']),
    success: gradient(['#00E676', '#00C853']),
    warning: gradient(['#FFD54F', '#FFCA28']),
    error: gradient(['#FF5252', '#FF1744']),
    info: gradient(['#40C4FF', '#00B0FF']),
    text: chalk.white,
    muted: chalk.gray,
    highlight: chalk.cyanBright,
    border: 'blue'
  },

  dracula: {
    name: 'Dracula',
    description: 'Popular dark theme with purple accents',
    primary: gradient(['#BD93F9', '#FF79C6']),
    secondary: gradient(['#8BE9FD', '#50FA7B']),
    success: gradient(['#50FA7B', '#5AF78E']),
    warning: gradient(['#FFB86C', '#FF9580']),
    error: gradient(['#FF5555', '#FF6E6E']),
    info: gradient(['#8BE9FD', '#79E0F0']),
    text: chalk.white,
    muted: chalk.gray,
    highlight: chalk.magenta,
    border: 'magenta'
  },

  monokai: {
    name: 'Monokai',
    description: 'Classic code editor theme',
    primary: gradient(['#F92672', '#FD971F']),
    secondary: gradient(['#A6E22E', '#66D9EF']),
    success: gradient(['#A6E22E', '#7FDB75']),
    warning: gradient(['#E6DB74', '#F8F8F0']),
    error: gradient(['#F92672', '#FF0055']),
    info: gradient(['#66D9EF', '#5ECFEF']),
    text: chalk.white,
    muted: chalk.gray,
    highlight: chalk.yellow,
    border: 'yellow'
  },

  nord: {
    name: 'Nord',
    description: 'Arctic-inspired theme',
    primary: gradient(['#88C0D0', '#81A1C1', '#5E81AC']),
    secondary: gradient(['#8FBCBB', '#5E81AC']),
    success: gradient(['#A3BE8C', '#8FBCBB']),
    warning: gradient(['#EBCB8B', '#D08770']),
    error: gradient(['#BF616A', '#D08770']),
    info: gradient(['#81A1C1', '#5E81AC']),
    text: chalk.white,
    muted: chalk.gray,
    highlight: chalk.blueBright,
    border: 'blue'
  },

  cyberpunk: {
    name: 'Cyberpunk',
    description: 'High-tech neon theme',
    primary: gradient(['#FF00FF', '#00FFFF', '#FFFF00']),
    secondary: gradient(['#FF00AA', '#00AAFF']),
    success: gradient(['#00FF00', '#00FFAA']),
    warning: gradient(['#FFFF00', '#FFAA00']),
    error: gradient(['#FF0066', '#FF00AA']),
    info: gradient(['#00FFFF', '#00AAFF']),
    text: chalk.white,
    muted: chalk.gray,
    highlight: chalk.magentaBright,
    border: 'magenta'
  }
};

/**
 * Get theme by name
 * @param {string} themeName - Name of the theme
 * @returns {object} Theme object
 */
function getTheme(themeName = 'nexus') {
  return themes[themeName] || themes.nexus;
}

/**
 * List all available themes
 * @returns {array} Array of theme names and descriptions
 */
function listThemes() {
  return Object.keys(themes).map(key => ({
    name: key,
    displayName: themes[key].name,
    description: themes[key].description
  }));
}

/**
 * Apply theme to text
 * @param {string} text - Text to style
 * @param {string} style - Style to apply (primary, secondary, success, etc.)
 * @param {string} themeName - Theme name
 * @returns {string} Styled text
 */
function applyTheme(text, style = 'primary', themeName = 'nexus') {
  const theme = getTheme(themeName);
  const styleFunc = theme[style] || theme.primary;

  return typeof styleFunc === 'function' ? styleFunc(text) : text;
}

/**
 * Create a themed box
 * @param {string} content - Box content
 * @param {string} themeName - Theme name
 * @param {object} options - Boxen options
 * @returns {object} Boxen options with theme colors
 */
function themedBoxOptions(themeName = 'nexus', options = {}) {
  const theme = getTheme(themeName);

  return {
    borderColor: theme.border,
    borderStyle: 'round',
    padding: 1,
    margin: 1,
    ...options
  };
}

/**
 * Demo all themes
 */
function demoThemes() {
  console.log('\n' + chalk.bold.white('Available CLI Themes:') + '\n');

  Object.entries(themes).forEach(([key, theme]) => {
    console.log(theme.primary(`${theme.name.padEnd(15)} - ${theme.description}`));
    console.log(
      '  ' +
      theme.success('Success ') +
      theme.warning('Warning ') +
      theme.error('Error ') +
      theme.info('Info')
    );
    console.log('');
  });
}

module.exports = {
  themes,
  getTheme,
  listThemes,
  applyTheme,
  themedBoxOptions,
  demoThemes
};
