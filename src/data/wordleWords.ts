// Fast in-memory word lists and loaders for Henry-Wordle

export async function loadWordleLists(): Promise<{ answers: string[]; guesses: Set<string> }> {
  try {
    const [ansRes, guessRes] = await Promise.all([
      fetch('./data/answers.txt'),
      fetch('./data/guesses.txt')
    ]);

    if (ansRes.ok && guessRes.ok) {
      const ansText = await ansRes.text();
      const guessText = await guessRes.text();

      const answers = ansText.split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(w => w.length === 5);
      const guessesList = guessText.split(/\r?\n/).map(w => w.trim().toUpperCase()).filter(w => w.length === 5);
      const guesses = new Set([...answers, ...guessesList]);
      if (answers.length > 50) {
        return { answers, guesses };
      }
    }
  } catch (err) {
    console.warn('Network load of word lists failed, falling back to embedded list:', err);
  }

  return {
    answers: FALLBACK_ANSWERS,
    guesses: new Set([...FALLBACK_ANSWERS, ...FALLBACK_EXTRA_GUESSES])
  };
}

export const FALLBACK_ANSWERS = [
  'SANTA', 'SNOWY', 'FROST', 'SLEDS', 'CHEER', 'MERRY', 'CANDY', 'HOLLY', 'CHILL', 'CABIN',
  'PINES', 'PEACE', 'ANGEL', 'BELLS', 'LIGHT', 'COMET', 'CLAWS', 'FLAKE', 'SKATE', 'WHITE',
  'ROAST', 'FEAST', 'SHINE', 'FIRES', 'CLOUD', 'LODGE', 'NORTH', 'GREEN', 'TREES', 'GIFTS',
  'STARS', 'CROWN', 'CAROL', 'NIGHT', 'SPARK', 'MAGIC', 'HAPPY', 'BLAZE', 'CRISP', 'GLOVE',
  'BOOTS', 'SCARF', 'SOCKS', 'STOVE', 'COCOA', 'FUDGE', 'SWEET', 'TREAT', 'BAKER', 'JELLY',
  'APPLE', 'CIDER', 'NUTTY', 'CRAFT', 'ROBIN', 'TRACK', 'TRAIL', 'RIVER', 'RIDGE', 'SLOPE',
  'DRIFT', 'POLAR', 'STORM', 'BLOWN', 'WINDY', 'GLEAM', 'FAIRY', 'WARMS', 'SMILE', 'LAUGH',
  'GAMES', 'BOARD', 'CARDS', 'CHESS', 'BRAIN', 'WORDS', 'GUESS', 'CLUES', 'POINT', 'SCORE',
  'CHAMP', 'MEDAL', 'HONOR', 'PRIDE', 'PARTY', 'DANCE', 'MUSIC', 'SONGS', 'CHORD', 'TUNES',
  'HOUSE', 'GATES', 'FLOWR', 'ROSES', 'DAISY', 'TULIP', 'FERNS', 'PLANT', 'SEEDS', 'FRUIT',
  'LEMON', 'MELON', 'MANGO', 'PEACH', 'GRAPE', 'OLIVE', 'BREAD', 'HONEY', 'SUGAR', 'SPICE'
];

export const FALLBACK_EXTRA_GUESSES = [
  'ABOUT', 'ABOVE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN', 'AGENT',
  'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG',
  'ALTER', 'AMONG', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLY', 'ARENA', 'ARGUE', 'ARISE',
  'ARMOR', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID', 'AWARD', 'AWARE', 'BADGE', 'BASIC',
  'BEACH', 'BEAST', 'BEGIN', 'BELOW', 'BENCH', 'BIRTH', 'BLACK', 'BLADE', 'BLAME', 'BLANK',
  'BLESS', 'BLIND', 'BLOCK', 'BLOOD', 'BLOOM', 'BOOST', 'BRAVE', 'BRICK', 'BRIEF', 'BRING',
  'BROAD', 'BROWN', 'BRUSH', 'BUILD', 'BUNCH', 'BUYER', 'CAMEL', 'CARGO', 'CARRY', 'CATCH',
  'CAUSE', 'CHAIN', 'CHAIR', 'CHALK', 'CHAMP', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHIEF',
  'CHILD', 'CHINA', 'CHOIR', 'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLERK', 'CLICK',
  'CLIFF', 'CLIMB', 'CLOCK', 'CLOSE', 'CLOTH', 'COACH', 'COAST', 'COLOR', 'COUCH', 'COUNT',
  'COURT', 'COVER', 'CRACK', 'CRAFT', 'CRANE', 'CRASH', 'CRAZY', 'CREAM', 'CREEK', 'CROSS',
  'CROWD', 'CRUSH', 'CYCLE', 'DAILY', 'DEATH', 'DELAY', 'DEPTH', 'DEVIL', 'DIARY', 'DRAFT',
  'DRAMA', 'DREAM', 'DRESS', 'DRINK', 'DRIVE', 'EARLY', 'EARTH', 'EIGHT', 'ELBOW', 'ELDER',
  'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'ESSAY', 'EVENT', 'EVERY',
  'EXACT', 'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY',
  'FIGHT', 'FINAL', 'FIRST', 'FLAME', 'FLASH', 'FLEET', 'FLOAT', 'FLOOD', 'FLOOR', 'FLOUR',
  'FLUID', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FOUND', 'FRAME', 'FRESH', 'FRONT', 'FRUIT',
  'GIANT', 'GLASS', 'GLOBE', 'GLORY', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRASS',
  'GRAVE', 'GREAT', 'GREET', 'GRIEF', 'GROUP', 'GROWN', 'GUARD', 'GUESS', 'GUIDE', 'HABIT',
  'HASTE', 'HAVEN', 'HEART', 'HEAVY', 'HEDGE', 'HEROIC', 'HONEY', 'HORSE', 'HOTEL', 'HUMAN',
  'HUMOR', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JEWEL', 'JOINT', 'JUDGE', 'JUICE',
  'KNIFE', 'KNOCK', 'LABEL', 'LABOR', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN',
  'LEASE', 'LEAST', 'LEMON', 'LEVEL', 'LIGHT', 'LIMIT', 'LUNCH', 'MAGIC', 'MAJOR', 'MAKER',
  'MARCH', 'MATCH', 'MAYOR', 'METAL', 'MIGHT', 'MINOR', 'MODEL', 'MONEY', 'MONTH', 'MORAL',
  'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NAKED', 'NERVE', 'NIGHT', 'NOBLE',
  'NOISE', 'NORTH', 'NOVEL', 'NURSE', 'OCEAN', 'OFFER', 'OFTEN', 'ORDER', 'OTHER', 'OUGHT',
  'PAINT', 'PANEL', 'PANIC', 'PAPER', 'PARTY', 'PEACE', 'PENNY', 'PHASE', 'PHONE', 'PHOTO',
  'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND',
  'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD',
  'PROVE', 'QUEEN', 'QUICK', 'QUIET', 'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO',
  'REACH', 'REACT', 'READY', 'REPLY', 'RIVER', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL',
  'SCALE', 'SCENE', 'SCOPE', 'SCORE', 'SENSE', 'SERVE', 'SEVEN', 'SHADE', 'SHAKE', 'SHAME',
  'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHIRT', 'SHOCK', 'SHOOT',
  'SHORT', 'SIGHT', 'SKILL', 'SLEEP', 'SLIDE', 'SMALL', 'SMART', 'SMILE', 'SMOKE', 'SOLID',
  'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPEAK', 'SPEED', 'SPEND', 'SPILL',
  'SPLIT', 'SPOON', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START', 'STATE', 'STEAM',
  'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE', 'STORE', 'STORM', 'STORY', 'STRIP', 'STUDY',
  'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TASTE', 'TEACH', 'THANK',
  'THEME', 'THERE', 'THICK', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THROW', 'TIGER',
  'TIGHT', 'TIMES', 'TIRED', 'TITLE', 'TODAY', 'TOOTH', 'TOPIC', 'TOTAL', 'TOUCH', 'TOUGH',
  'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRIP', 'TRUCK',
  'TRULY', 'TRUTH', 'TWICE', 'UNCLE', 'UNDER', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET',
  'URBAN', 'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOICE',
  'WASTE', 'WATCH', 'WATER', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE',
  'WOMAN', 'WORLD', 'WORRY', 'WORTH', 'WOULD', 'WOUND', 'WRITE', 'WRONG', 'YOUTH', 'ZEBRA'
];
