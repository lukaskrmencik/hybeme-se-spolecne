const fs = require('fs');
const path = require('path');

const dist = path.resolve(process.argv[2] || 'dist');
const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|css)$/.test(entry.name)) files.push('/' + path.relative(dist, full).split(path.sep).join('/'));
  }
};
walk(path.join(dist, '_expo', 'static'));
fs.writeFileSync(path.join(dist, 'precache.json'), JSON.stringify(files.sort()));
console.log(`precache.json: ${files.length} files`);
