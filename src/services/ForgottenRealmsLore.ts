/**
 * ForgottenRealmsLore.ts
 *
 * Direct integration with the canonical Forgotten Realms Fandom MediaWiki API
 * (https://forgottenrealms.fandom.com/api.php?origin=*) with zero-proxy client-side CORS support,
 * paired with an instant offline canon cache for Sword Coast / Faerûn landmarks.
 */

export interface FaerunLocation {
  id: string;
  name: string;
  aliases: string[];
  region: string;
  summary: string;
  loreSnippet: string;
  deities?: string[];
  biome: 'temperate' | 'tundra' | 'autumn' | 'sakura' | 'underdark' | 'arctic';
  poiType: 'monolith' | 'shrine' | 'waystone' | 'ruin' | 'grove' | 'cache';
  worldCoords: [number, number]; // X, Z
}

// Built-in canonical offline cache of iconic Faerûn POIs
export const CANONICAL_FAERUN_LOCATIONS: FaerunLocation[] = [
  {
    id: 'poi_high_forest',
    name: 'The High Forest',
    aliases: ['Great Everwood'],
    region: 'Northwest Faerûn',
    summary: 'A vast primeval woodland covering hundreds of leagues, home to ancient treants, wild elves, centaurs, and forgotten Netherese ruins.',
    loreSnippet: 'Ancient redwood-carved canopies rustle with elven magic and the lingering blessings of Silvanus and Mielikki.',
    deities: ['Silvanus', 'Mielikki', 'Corellon Larethian'],
    biome: 'temperate',
    poiType: 'grove',
    worldCoords: [-18, 16]
  },
  {
    id: 'poi_waterdeep',
    name: 'Waterdeep',
    aliases: ['City of Splendors', 'Crown of the North'],
    region: 'Sword Coast North',
    summary: 'The most influential metropolis in all the North, governed by the secretive Masked Lords and protected by the Walking Statues.',
    loreSnippet: 'Bustling harbor trades, wizards of the Blackstaff Tower, and deep under the city lies the multi-layered sprawl of Undermountain.',
    deities: ['Oghma', 'Mystra', 'Selûne', 'Tymora'],
    biome: 'temperate',
    poiType: 'waystone',
    worldCoords: [18, 12]
  },
  {
    id: 'poi_neverwinter',
    name: 'Neverwinter',
    aliases: ['City of Skilled Hands', 'Jewel of the North'],
    region: 'Sword Coast North',
    summary: 'Warm river waters warmed by fire elementals beneath Mount Hotenow prevent the city harbor from ever freezing over.',
    loreSnippet: 'Master crafters, intricate water clocks, and garden bridges span the steaming river even amid harsh northern winters.',
    deities: ['Helm', 'Tyr', 'Oghma'],
    biome: 'autumn',
    poiType: 'waystone',
    worldCoords: [22, -20]
  },
  {
    id: 'poi_candlekeep',
    name: 'Candlekeep',
    aliases: ['The Great Library', 'Citadel of Books'],
    region: 'Sword Coast South',
    summary: 'A soaring volcanic crag overlooking the Sea of Swords, housing the greatest repository of recorded knowledge and prophecy across Toril.',
    loreSnippet: 'Admission requires donating a book not already within the vast vaults guarded by the Avowed monks of Oghma.',
    deities: ['Oghma', 'Deneir', 'Gond', 'Milil'],
    biome: 'temperate',
    poiType: 'shrine',
    worldCoords: [-22, -18]
  },
  {
    id: 'poi_icewind_dale',
    name: 'Icewind Dale',
    aliases: ['The Frozen North', 'Land of Ten-Towns'],
    region: 'The Spine of the World',
    summary: 'A bleak, arctic tundra stretching north of the Spine of the World, where resilient fishermen harvest knucklehead trout from frozen lakes.',
    loreSnippet: 'Howling blizzards, reghed barbarians, and ancient Netherese crystalline glaciers hidden under centuries of pack ice.',
    deities: ['Auril', 'Tempus'],
    biome: 'arctic',
    poiType: 'monolith',
    worldCoords: [-8, 28]
  },
  {
    id: 'poi_underdark',
    name: 'Underdark Spore Chasm',
    aliases: ['The Night Below', 'Deepearth'],
    region: 'Subterranean Faerûn',
    summary: 'A vast subterranean network of cavernous passages, bioluminescent spore forests, and ancient drow and duergar citadels.',
    loreSnippet: 'Phosphorescent fungi illuminate towering fungal caps while faerzress radiation pulses through the stone.',
    deities: ['Lolth', 'Eilistraee', 'Ghaunadaur'],
    biome: 'underdark',
    poiType: 'ruin',
    worldCoords: [12, -26]
  },
  {
    id: 'poi_myth_drannor',
    name: 'Myth Drannor',
    aliases: ['City of Song', 'City of Love'],
    region: 'Cormanthor',
    summary: 'The ancient elven jewel of Cormanthor where elves, humans, dwarves, and halflings lived in harmonic unity beneath the great Mythal.',
    loreSnippet: 'The shimmering remnants of the ancient Mythal weave protective enchantments among overgrown white marble arches.',
    deities: ['Corellon Larethian', 'Sehanine Moonbow', 'Mystra'],
    biome: 'sakura',
    poiType: 'ruin',
    worldCoords: [-10, -8]
  }
];

/**
 * Live Fandom MediaWiki search query
 */
export async function searchForgottenRealms(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
  const url = `https://forgottenrealms.fandom.com/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json&origin=*`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const titles: string[] = data[1] || [];
    const urls: string[] = data[3] || [];
    return titles.map((title, i) => ({
      title,
      url: urls[i] || `https://forgottenrealms.fandom.com/wiki/${encodeURIComponent(title)}`,
      snippet: ''
    }));
  } catch (err) {
    console.warn('[LoreService] OpenSearch failed, falling back to local filter:', err);
    return CANONICAL_FAERUN_LOCATIONS
      .filter(l => l.name.toLowerCase().includes(query.toLowerCase()) || l.region.toLowerCase().includes(query.toLowerCase()))
      .map(l => ({ title: l.name, url: `https://forgottenrealms.fandom.com/wiki/${encodeURIComponent(l.name)}`, snippet: l.summary }));
  }
}

/**
 * Fetch the clean lead section text of any Forgotten Realms page
 */
export async function fetchFaerunArticleLead(pageTitle: string): Promise<string> {
  const url = `https://forgottenrealms.fandom.com/api.php?action=parse&page=${encodeURIComponent(pageTitle)}&prop=text&section=0&format=json&origin=*`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.parse || !data.parse.text) return '';
    const rawHtml: string = data.parse.text['*'];

    // Strip HTML tags and clean whitespace
    const div = document.createElement('div');
    div.innerHTML = rawHtml;
    // Remove unwanted tables, infoboxes, hatnotes
    const unwanted = div.querySelectorAll('.infobox, .hatnote, table, .mw-empty-elt');
    unwanted.forEach(el => el.remove());

    const text = (div.textContent || '').replace(/\s+/g, ' ').trim();
    return text.slice(0, 480);
  } catch (err) {
    console.warn(`[LoreService] Article fetch failed for ${pageTitle}:`, err);
    const local = CANONICAL_FAERUN_LOCATIONS.find(l => l.name.toLowerCase() === pageTitle.toLowerCase());
    return local ? `${local.summary} ${local.loreSnippet}` : '';
  }
}
