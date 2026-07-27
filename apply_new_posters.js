import fs from 'fs';

// Read wiki posters mapping
const posters = JSON.parse(fs.readFileSync('wiki_posters.json', 'utf-8'));

// We also need to add moonknight manually because it wasn't matched (we found its URL)
posters["moonknight"] = "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Moon_Knight_%28miniseries%29_logo.jpg/250px-Moon_Knight_%28miniseries%29_logo.jpg";
// And secretwars fallback (or a clean, stable marvel logo)
posters["secretwars"] = "https://upload.wikimedia.org/wikipedia/commons/b/b9/Marvel_Logo.svg";

let content = fs.readFileSync('./src/data/mcuData.ts', 'utf-8');

// For each id, we want to find the object with that id and replace its posterUrl
// Example format:
//   {
//     id: 'ironman',
//     ...
//     posterUrl: 'https://images.unsplash.com/...',
//
// Let's use a robust replacement strategy
const ids = Object.keys(posters);
let replacedCount = 0;

for (const id of ids) {
  const posterUrl = posters[id];
  // Regex to find the posterUrl inside the object containing id: '...'
  // We can look for the block containing "id: 'id'" and then replace the "posterUrl: '...'" within that block
  const blockRegex = new RegExp(`(id:\\s*'${id}',[\\s\\S]*?posterUrl:\\s*')([^']+)(')`, 'm');
  
  if (blockRegex.test(content)) {
    content = content.replace(blockRegex, `$1${posterUrl}$3`);
    replacedCount++;
  } else {
    console.log(`Failed to replace for ID: ${id}`);
  }
}

fs.writeFileSync('./src/data/mcuData.ts', content, 'utf-8');
console.log(`Replaced ${replacedCount} out of ${ids.length} poster URLs in mcuData.ts.`);
