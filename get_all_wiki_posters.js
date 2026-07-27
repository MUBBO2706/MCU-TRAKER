import fs from 'fs';

const wikiMappings = {
  "ironman": "Iron_Man_(2008_film)",
  "incredible_hulk": "The_Incredible_Hulk_(film)",
  "ironman2": "Iron_Man_2",
  "thor": "Thor_(film)",
  "captainamerica": "Captain_America:_The_First_Avenger",
  "avengers": "The_Avengers_(2012_film)",
  "ironman3": "Iron_Man_3",
  "thor_tdw": "Thor:_The_Dark_World",
  "captainamerica_ws": "Captain_America:_The_Winter_Soldier",
  "guardians": "Guardians_of_the_Galaxy_(film)",
  "ageofultron": "Avengers:_Age_of_Ultron",
  "antman": "Ant-Man_(film)",
  "civilwar": "Captain_America:_Civil_War",
  "doctor_strange": "Doctor_Strange_(2016_film)",
  "guardians2": "Guardians_of_the_Galaxy_Vol._2",
  "spiderman_homecoming": "Spider-Man:_Homecoming",
  "thor_ragnarok": "Thor:_Ragnarok",
  "blackpanther": "Black_Panther_(film)",
  "infinitywar": "Avengers:_Infinity_War",
  "antman_wasp": "Ant-Man_and_the_Wasp",
  "captainmarvel": "Captain_Marvel_(film)",
  "endgame": "Avengers:_Endgame",
  "far_from_home": "Spider-Man:_Far_From_Home",
  "wandavision": "WandaVision",
  "falcon_winter_soldier": "The_Falcon_and_the_Winter_Soldier",
  "loki": "Loki_(season_1)",
  "blackwidow": "Black_Widow_(2021_film)",
  "shangchi": "Shang-Chi_and_the_Legend_of_the_Ten_Rings",
  "eternals": "Eternals_(film)",
  "no_way_home": "Spider-Man:_No_Way_Home",
  "moonknight": "Moon_Knight_(television_miniseries)",
  "multiverse_madness": "Doctor_Strange_in_the_Multiverse_of_Madness",
  "ms_marvel": "Ms._Marvel_(miniseries)",
  "thor_love_thunder": "Thor:_Love_and_Thunder",
  "she_hulk": "She-Hulk:_Attorney_at_Law",
  "wakanda_forever": "Black_Panther:_Wakanda_Forever",
  "quantumania": "Ant-Man_and_the_Wasp:_Quantumania",
  "guardians3": "Guardians_of_the_Galaxy_Vol._3",
  "secret_invasion": "Secret_Invasion_(miniseries)",
  "loki_s2": "Loki_(season_2)",
  "the_marvels": "The_Marvels",
  "echo": "Echo_(miniseries)",
  "deadpool_wolverine": "Deadpool_&_Wolverine",
  "agatha": "Agatha_All_Along",
  "brave_new_world": "Captain_America:_Brave_New_World",
  "thunderbolts": "Thunderbolts*_(film)",
  "daredevil_born_again": "Daredevil:_Born_Again",
  "doomsday": "Avengers:_Doomsday",
  "secretwars": "Avengers:_Secret_Wars"
};

async function scrapeAll() {
  const results = {};
  const entries = Object.entries(wikiMappings);

  for (const [id, wikiTitle] of entries) {
    const url = `https://en.wikipedia.org/wiki/${wikiTitle}`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MCU-Companion/1.0'
        }
      });
      const html = await response.text();
      
      const matchTable = html.match(/<table[^>]+class="[^"]*infobox[^"]*"[^>]*>/i);
      let foundSrc = null;
      if (matchTable) {
        const startIndex = matchTable.index;
        const endIndex = html.indexOf('</table>', startIndex);
        const infoboxHtml = html.substring(startIndex, endIndex);
        
        const matches = [...infoboxHtml.matchAll(/src="([^"]+)"/g)];
        for (const m of matches) {
          const src = m[1];
          if (
            (src.includes('upload.wikimedia.org/wikipedia/en/') || src.includes('upload.wikimedia.org/wikipedia/commons/')) &&
            !src.includes('static-assets') &&
            !src.includes('pencil') && 
            !src.includes('edit')
          ) {
            foundSrc = src;
            break;
          }
        }
      }
      
      if (foundSrc) {
        results[id] = 'https:' + foundSrc;
        console.log(`Success: ${id} -> https:${foundSrc}`);
      } else {
        console.log(`FAIL: ${id} (Wiki page: ${wikiTitle})`);
      }
    } catch (e) {
      console.log(`ERROR ${id}:`, e.message);
    }
  }

  fs.writeFileSync('wiki_posters.json', JSON.stringify(results, null, 2));
  console.log(`Scraping completed. Wrote ${Object.keys(results).length} posters.`);
}

scrapeAll();
