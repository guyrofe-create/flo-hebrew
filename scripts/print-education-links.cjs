const fs = require('fs');

const s = fs.readFileSync('lib/educationLinks.ts', 'utf8');
const home = (s.match(/HOME_URL\s*=\s*'([^']+)'/) || [])[1] || '';
const b = s.match(/EDUCATION_SLUGS[\s\S]*?=\s*\{([\s\S]*?)\};/);

if (!b) {
  console.error('No slugs block found');
  process.exit(1);
}

const block = b[1];
const re = /\s*([a-zA-Z0-9_]+)\s*:\s*'([^']+)'/g;

let m;
while ((m = re.exec(block))) {
  console.log(m[1], '->', home + m[2]);
}
