import { ScavengerItemDef } from '../types';
import { getDateSeed, getTodayDateKey } from '../utils/dailyClock';

interface CandidateSpot {
  hint: string;
  locationName: string;
  x: number;
  y: number;
  z: number;
}

const BELL_SPOTS: CandidateSpot[] = [
  {
    hint: 'Sparkling in the cobblestone center of Town Square near the Snowman Podium.',
    locationName: 'Town Square Plaza',
    x: 0,
    y: 2.2,
    z: 4
  },
  {
    hint: "Tucked right behind Santa's crimson sleigh runners on the South Beach.",
    locationName: "Santa's Sleigh Runway",
    x: 3,
    y: 2.2,
    z: 45
  },
  {
    hint: 'Echoing softly behind the stone tower arches of Quiz Lodge.',
    locationName: 'Quiz Lodge Bell Tower',
    x: -48,
    y: 2.2,
    z: 12
  },
  {
    hint: "Resting on a frosted snowdrift near the Elves' wooden toy train.",
    locationName: 'Toy Workshop Yard',
    x: 42,
    y: 2.2,
    z: -30
  },
  {
    hint: 'Gleaming beside the frosted cobblestones where the lake path splits.',
    locationName: 'Eastern Shore Crossroads',
    x: 24,
    y: 2.2,
    z: 18
  },
  {
    hint: 'Dangling from a snow-covered post along the path to the Target 24 Chalet.',
    locationName: 'Target 24 Mountain Path',
    x: -38,
    y: 2.2,
    z: 26
  }
];

const COOKIE_SPOTS: CandidateSpot[] = [
  {
    hint: 'Resting on a warm log bench by the roaring outdoor campfire pit.',
    locationName: 'Cozy Hearth & Campfire',
    x: -42,
    y: 2.2,
    z: -25
  },
  {
    hint: 'Tucked behind the rustic pine log cabin out of the icy wind.',
    locationName: 'Cozy Hearth Woodshed',
    x: -46,
    y: 2.2,
    z: -29
  },
  {
    hint: 'Resting by the snow-covered firewood stack beside Wordle Lodge.',
    locationName: 'Wordle Firewood Store',
    x: -8,
    y: 2.2,
    z: -46
  },
  {
    hint: 'Left on a rock ledge on the mountain trail leading to Word Ladder.',
    locationName: 'Word Ladder Lower Ridge',
    x: 32,
    y: 2.2,
    z: 32
  },
  {
    hint: 'Placed beside the wooden message board where the family chats.',
    locationName: 'Town Bulletin Board',
    x: -16,
    y: 2.2,
    z: 8
  },
  {
    hint: 'Perched on a snowy barrel near the front of Target 24 Math Chalet.',
    locationName: 'Target 24 Math Chalet',
    x: -32,
    y: 2.2,
    z: 36
  }
];

const GIFT_SPOTS: CandidateSpot[] = [
  {
    hint: "Tucked beside the toy-making workbench at Santa's Elves' House.",
    locationName: "Santa's Elves' Workshop",
    x: 45,
    y: 2.2,
    z: -35
  },
  {
    hint: "Hidden in the deep snow behind the Elves' festive green cottage.",
    locationName: "Elves' Backyard Snowdrift",
    x: 49,
    y: 2.2,
    z: -42
  },
  {
    hint: 'Nestled in the snow near the children playing beside Rudolph.',
    locationName: 'Santa & Children Gathering',
    x: -2,
    y: 2.2,
    z: 47
  },
  {
    hint: 'Stashed away behind the west wall of Quiz Lodge.',
    locationName: 'Quiz Lodge Garden',
    x: -52,
    y: 2.2,
    z: 2
  },
  {
    hint: 'Hidden behind a cluster of frosted spruce trees on the northeast trail.',
    locationName: 'Whispering Pine Copse',
    x: 28,
    y: 2.2,
    z: -15
  },
  {
    hint: 'Hidden in the snowy alcove behind the Target 24 Math Chalet.',
    locationName: 'Math Chalet Backyard',
    x: -40,
    y: 2.2,
    z: 34
  }
];

const SCARF_SPOTS: CandidateSpot[] = [
  {
    hint: 'Draped peacefully over the wooden dock railing of Henry Lake.',
    locationName: 'Henry Lake Viewing Dock',
    x: 22,
    y: 2.2,
    z: 4
  },
  {
    hint: 'Wrapped around a smooth granite boulder on the southern bank of Henry Lake.',
    locationName: 'Henry Lake South Shore',
    x: 52,
    y: 2.2,
    z: 18
  },
  {
    hint: 'Caught on a pine branch on the frosty northern cliff edge.',
    locationName: 'Northern Pine Lookout',
    x: -24,
    y: 2.2,
    z: -38
  },
  {
    hint: 'Flapping gently in the alpine breeze behind the Word Ladder Lodge.',
    locationName: 'Word Ladder Alpine Ridge',
    x: 42,
    y: 2.2,
    z: 42
  },
  {
    hint: 'Hung on a festive red-and-white striped candy cane pole.',
    locationName: 'Candy Cane Lane',
    x: -4,
    y: 2.2,
    z: -20
  },
  {
    hint: 'Draped over a milestone rock on the trail to Target 24.',
    locationName: 'Southwest Mountain Trail',
    x: -28,
    y: 2.2,
    z: 22
  }
];

const STAR_SPOTS: CandidateSpot[] = [
  {
    hint: 'Gleaming high on the scenic mountain ridge leading to Word Ladder Lodge.',
    locationName: 'Word Ladder Mountain Summit',
    x: 38,
    y: 2.2,
    z: 38
  },
  {
    hint: 'Shining brightly in the snowbank behind the Wordle Lodge.',
    locationName: 'Wordle Lodge High Ridge',
    x: 0,
    y: 2.2,
    z: -55
  },
  {
    hint: 'Glowing amongst the waddling penguins on the icy northeast coast.',
    locationName: 'Penguin Iceberg Coast',
    x: 30,
    y: 2.2,
    z: -40
  },
  {
    hint: 'Illuminating the western sea cliffs behind Quiz Lodge.',
    locationName: 'Western Sunset Cliffs',
    x: -56,
    y: 2.2,
    z: 4
  },
  {
    hint: 'Reflecting beautifully off the crystal water on the far shore of Henry Lake.',
    locationName: 'Henry Lake Far Bank',
    x: 60,
    y: 2.2,
    z: 4
  },
  {
    hint: 'Floating above the math dice monument at Target 24 Chalet.',
    locationName: 'Target 24 Plaza',
    x: -36,
    y: 2.2,
    z: 32
  }
];

/**
 * Returns the 5 daily scavenger hunt items with locations that change each day.
 */
export function getDailyScavengerItems(dateKey = getTodayDateKey()): ScavengerItemDef[] {
  const seedBell = getDateSeed(dateKey + '-scav-bell');
  const seedCookie = getDateSeed(dateKey + '-scav-cookie');
  const seedGift = getDateSeed(dateKey + '-scav-gift');
  const seedScarf = getDateSeed(dateKey + '-scav-scarf');
  const seedStar = getDateSeed(dateKey + '-scav-star');

  const spotBell = BELL_SPOTS[seedBell % BELL_SPOTS.length];
  const spotCookie = COOKIE_SPOTS[seedCookie % COOKIE_SPOTS.length];
  const spotGift = GIFT_SPOTS[seedGift % GIFT_SPOTS.length];
  const spotScarf = SCARF_SPOTS[seedScarf % SCARF_SPOTS.length];
  const spotStar = STAR_SPOTS[seedStar % STAR_SPOTS.length];

  return [
    {
      id: 'item_bell',
      name: 'Golden Jingle Bell',
      emoji: '🔔',
      icon: '🔔',
      hint: spotBell.hint,
      locationName: spotBell.locationName,
      x: spotBell.x,
      y: spotBell.y,
      z: spotBell.z,
      color: 0xfacc15
    },
    {
      id: 'item_cookie',
      name: 'Spiced Gingerbread Man',
      emoji: '🍪',
      icon: '🍪',
      hint: spotCookie.hint,
      locationName: spotCookie.locationName,
      x: spotCookie.x,
      y: spotCookie.y,
      z: spotCookie.z,
      color: 0xd97706
    },
    {
      id: 'item_gift',
      name: 'Elven Toy Surprise',
      emoji: '🎁',
      icon: '🎁',
      hint: spotGift.hint,
      locationName: spotGift.locationName,
      x: spotGift.x,
      y: spotGift.y,
      z: spotGift.z,
      color: 0xef4444
    },
    {
      id: 'item_scarf',
      name: 'Cozy Woolen Scarf',
      emoji: '🧣',
      icon: '🧣',
      hint: spotScarf.hint,
      locationName: spotScarf.locationName,
      x: spotScarf.x,
      y: spotScarf.y,
      z: spotScarf.z,
      color: 0x3b82f6
    },
    {
      id: 'item_star',
      name: 'Glowing Star Fragment',
      emoji: '⭐',
      icon: '⭐',
      hint: spotStar.hint,
      locationName: spotStar.locationName,
      x: spotStar.x,
      y: spotStar.y,
      z: spotStar.z,
      color: 0xfef08a
    }
  ];
}

// Backward-compatible export for today's items
export const DAILY_SCAVENGER_ITEMS: ScavengerItemDef[] = getDailyScavengerItems();
