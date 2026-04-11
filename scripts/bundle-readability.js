#!/usr/bin/env node
// AUTO-RUN via postinstall — regenerates lib/readabilitySource.ts from
// the currently installed @mozilla/readability package.
// To update Readability: npm update @mozilla/readability

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.resolve(__dirname, '../node_modules/@mozilla/readability/Readability.js'),
  'utf-8'
);

const version = require('../node_modules/@mozilla/readability/package.json').version;

const output =
  `// AUTO-GENERATED — do not edit.\n` +
  `// Source: @mozilla/readability@${version}\n` +
  `// Regenerate: npm install  (runs postinstall automatically)\n` +
  `const readabilitySource = ${JSON.stringify(src)};\n` +
  `export default readabilitySource;\n`;

const dest = path.resolve(__dirname, '../lib/readabilitySource.ts');
fs.writeFileSync(dest, output);
console.log(`bundled @mozilla/readability@${version} → lib/readabilitySource.ts`);
