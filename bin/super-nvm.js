#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const compiledCli = path.join(__dirname, '..', 'out', 'server', 'cli.js');

if (!fs.existsSync(compiledCli)) {
  console.log('Compiling Super NVM TypeScript sources...');
  const { execSync } = require('child_process');
  execSync('npm run compile', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

require(compiledCli);
