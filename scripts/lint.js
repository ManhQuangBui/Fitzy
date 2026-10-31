const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');

const requestedRoot = process.argv[2] || '.';
const root = path.basename(process.cwd()) === requestedRoot ? process.cwd() : path.resolve(process.cwd(), requestedRoot);
const skip = new Set(['node_modules', '.expo', 'dist', 'build', 'coverage']);
function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return skip.has(entry.name) ? [] : filesIn(absolute);
    return /\.(?:js|jsx|mjs|cjs)$/.test(entry.name) ? [absolute] : [];
  });
}

let failures = 0;
for (const file of filesIn(root)) {
  try { parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'unambiguous', plugins: ['jsx'] }); }
  catch (error) { failures += 1; process.stderr.write(`${path.relative(root, file)}:${error.loc?.line || 0}:${error.loc?.column || 0} ${error.message}\n`); }
}
if (failures) process.exitCode = 1;
else process.stdout.write(`Parsed ${filesIn(root).length} JavaScript files in ${path.basename(root)}.\n`);
