import fs from 'fs';

// Simple parser for mcuData.ts to extract id, title, and posterUrl
const content = fs.readFileSync('./src/data/mcuData.ts', 'utf-8');

// We can extract them using regular expressions or dynamic import
// Let's use regular expressions to find all title blocks
const regex = /id:\s*'([^']+)',\s*title:\s*'([^']+)'(?:[\s\S]*?)(?:posterUrl:\s*'([^']+)')/g;

let match;
const results = [];
while ((match = regex.exec(content)) !== null) {
  results.push({ id: match[1], title: match[2], posterUrl: match[3] });
}

console.log(JSON.stringify(results, null, 2));
console.log('Total titles found:', results.length);
