const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Esto fuerza a Puppeteer a descargar Chrome DENTRO de tu carpeta de proyecto
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
