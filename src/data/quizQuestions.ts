import { QuizQuestion } from '../types';

export const TEEN_QUIZ_QUESTIONS: QuizQuestion[] = [
  // --- Geography ---
  {
    id: 1,
    category: 'Geography',
    question: 'What is the capital city of Australia?',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
    correctIndex: 2,
    explanation: 'Canberra was chosen as a compromise between Sydney and Melbourne in 1908.'
  },
  {
    id: 2,
    category: 'Geography',
    question: 'Which is the longest river in the United Kingdom?',
    options: ['River Thames', 'River Severn', 'River Trent', 'River Mersey'],
    correctIndex: 1,
    explanation: 'The River Severn flows for 220 miles (354 km).'
  },
  {
    id: 3,
    category: 'Geography',
    question: 'Mount Everest sits on the border between Nepal and which other country / region?',
    options: ['India', 'Bhutan', 'China (Tibet)', 'Pakistan'],
    correctIndex: 2,
    explanation: 'Everest sits directly along the Nepal-China border in the Himalayas.'
  },
  {
    id: 4,
    category: 'Geography',
    question: 'Which country is home to the city of Marrakech and the Atlas Mountains?',
    options: ['Morocco', 'Egypt', 'Tunisia', 'Jordan'],
    correctIndex: 0,
    explanation: 'Marrakech is in western Morocco near the foot of the Atlas Mountains.'
  },
  {
    id: 5,
    category: 'Geography',
    question: 'What is the smallest country in the world by both area and population?',
    options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
    correctIndex: 1,
    explanation: 'Vatican City covers roughly 0.49 square kilometers in Rome.'
  },
  {
    id: 6,
    category: 'Geography',
    question: 'Which US state is nicknamed the "Sunshine State"?',
    options: ['California', 'Florida', 'Hawaii', 'Arizona'],
    correctIndex: 1,
    explanation: 'Florida adopted "Sunshine State" as its official nickname in 1970.'
  },
  {
    id: 7,
    category: 'Geography',
    question: 'What continent has the most countries?',
    options: ['Asia', 'Europe', 'Africa', 'South America'],
    correctIndex: 2,
    explanation: 'Africa contains 54 fully recognized sovereign countries.'
  },
  {
    id: 8,
    category: 'Geography',
    question: 'In which European city would you find the Colosseum?',
    options: ['Athens', 'Rome', 'Madrid', 'Florence'],
    correctIndex: 1,
    explanation: 'The Colosseum is the ancient Roman amphitheatre in Rome, Italy.'
  },
  {
    id: 9,
    category: 'Geography',
    question: 'Which ocean lies between Europe and North America?',
    options: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
    correctIndex: 1,
    explanation: 'The Atlantic Ocean separates North America and South America from Europe and Africa.'
  },
  {
    id: 10,
    category: 'Geography',
    question: 'Which Nordic country is famous for its fjords and capital city Oslo?',
    options: ['Sweden', 'Finland', 'Norway', 'Denmark'],
    correctIndex: 2,
    explanation: 'Norway is renowned for its deep glacial fjords and Oslo.'
  },

  // --- Science and Nature ---
  {
    id: 11,
    category: 'Science and Nature',
    question: 'What chemical element has the symbol "Au" on the periodic table?',
    options: ['Silver', 'Gold', 'Copper', 'Aluminum'],
    correctIndex: 1,
    explanation: 'Au comes from the Latin word "aurum", meaning shining dawn.'
  },
  {
    id: 12,
    category: 'Science and Nature',
    question: 'Which planet in our solar system is known as the "Red Planet"?',
    options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correctIndex: 1,
    explanation: 'Mars appears reddish due to iron oxide (rust) on its surface.'
  },
  {
    id: 13,
    category: 'Science and Nature',
    question: 'What is the powerhouse organelle of an animal cell?',
    options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'],
    correctIndex: 1,
    explanation: 'Mitochondria generate most of the chemical energy (ATP) needed by the cell.'
  },
  {
    id: 14,
    category: 'Science and Nature',
    question: 'What is the hardest natural mineral known on Earth?',
    options: ['Quartz', 'Topaz', 'Diamond', 'Ruby'],
    correctIndex: 2,
    explanation: 'Diamond rates 10 on the Mohs hardness scale.'
  },
  {
    id: 15,
    category: 'Science and Nature',
    question: 'What type of animal is a Komodo dragon?',
    options: ['Snake', 'Lizard', 'Crocodile', 'Salamander'],
    correctIndex: 1,
    explanation: 'The Komodo dragon is the largest living species of lizard.'
  },
  {
    id: 16,
    category: 'Science and Nature',
    question: 'At what temperature Celsius does pure water freeze at standard sea level?',
    options: ['0°C', '32°C', '-5°C', '100°C'],
    correctIndex: 0,
    explanation: 'Pure water freezes at 0 degrees Celsius (32 degrees Fahrenheit).'
  },
  {
    id: 17,
    category: 'Science and Nature',
    question: 'What gas do plants absorb from the air during photosynthesis?',
    options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Helium'],
    correctIndex: 1,
    explanation: 'Plants absorb carbon dioxide and release oxygen during photosynthesis.'
  },
  {
    id: 18,
    category: 'Science and Nature',
    question: 'Which bird is famous for being flightless and swimming in Antarctic waters?',
    options: ['Puffin', 'Albatross', 'Penguin', 'Pelican'],
    correctIndex: 2,
    explanation: 'Penguins are flightless seabirds specially adapted for swimming.'
  },
  {
    id: 19,
    category: 'Science and Nature',
    question: 'What is the closest star to planet Earth?',
    options: ['Proxima Centauri', 'The Sun', 'Sirius', 'Betelgeuse'],
    correctIndex: 1,
    explanation: 'The Sun is our closest star, sitting approximately 93 million miles away.'
  },
  {
    id: 20,
    category: 'Science and Nature',
    question: 'How many bones are there in an adult human body?',
    options: ['156', '206', '256', '306'],
    correctIndex: 1,
    explanation: 'An adult human skeleton has 206 bones.'
  },

  // --- Entertainment (Gaming, Movies, Streaming) ---
  {
    id: 21,
    category: 'Entertainment',
    question: 'In Minecraft, what material is required alongside Obsidian to build a Nether Portal?',
    options: ['Redstone Dust', 'Flint and Steel', 'Diamond Pickaxe', 'Eye of Ender'],
    correctIndex: 1,
    explanation: 'You ignite the obsidian frame with Flint and Steel (or fire).'
  },
  {
    id: 22,
    category: 'Entertainment',
    question: 'Who played Peter Parker / Spider-Man in the MCU movie "No Way Home" alongside Tobey and Andrew?',
    options: ['Tom Holland', 'Timothée Chalamet', 'Austin Butler', 'Dylan O’Brien'],
    correctIndex: 0,
    explanation: 'Tom Holland portrays Peter Parker in the Marvel Cinematic Universe.'
  },
  {
    id: 23,
    category: 'Entertainment',
    question: 'Which popular battle royale game features the "Battle Bus" and "V-Bucks"?',
    options: ['Apex Legends', 'Fortnite', 'PUBG', 'Call of Duty: Warzone'],
    correctIndex: 1,
    explanation: 'Fortnite was developed by Epic Games and introduced the Battle Bus in 2017.'
  },
  {
    id: 24,
    category: 'Entertainment',
    question: 'In the Harry Potter series, which house at Hogwarts has a badger as its crest?',
    options: ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'],
    correctIndex: 1,
    explanation: 'Hufflepuff is symbolized by the loyal badger.'
  },
  {
    id: 25,
    category: 'Entertainment',
    question: 'What is the name of the fictional town in Indiana where "Stranger Things" takes place?',
    options: ['Riverdale', 'Hawkins', 'Sunnydale', 'Mystic Falls'],
    correctIndex: 1,
    explanation: 'Stranger Things is set in the 1980s fictional town of Hawkins, Indiana.'
  },
  {
    id: 26,
    category: 'Entertainment',
    question: 'In the animated movie "Spider-Man: Into the Spider-Verse", what is the main hero’s name?',
    options: ['Peter Parker', 'Miles Morales', 'Gwen Stacy', 'Miguel O’Hara'],
    correctIndex: 1,
    explanation: 'Miles Morales becomes Brooklyn’s Spider-Man.'
  },
  {
    id: 27,
    category: 'Entertainment',
    question: 'Which platform developed the wildly popular sandbox game "Roblox"?',
    options: ['Valve', 'Roblox Corporation', 'Epic Games', 'Mojang'],
    correctIndex: 1,
    explanation: 'David Baszucki and Erik Cassel founded Roblox Corporation.'
  },
  {
    id: 28,
    category: 'Entertainment',
    question: 'Who is the green dinosaur-like companion of Mario and Luigi in Nintendo games?',
    options: ['Bowser', 'Toad', 'Yoshi', 'Koopa'],
    correctIndex: 2,
    explanation: 'Yoshi first appeared in Super Mario World on the SNES.'
  },
  {
    id: 29,
    category: 'Entertainment',
    question: 'In "The Hunger Games", what is the tribute district where Katniss Everdeen lives?',
    options: ['District 1', 'District 4', 'District 11', 'District 12'],
    correctIndex: 3,
    explanation: 'Katniss lives in District 12, the Appalachian coal-mining district.'
  },
  {
    id: 30,
    category: 'Entertainment',
    question: 'Which Studio Ghibli film features a magical moving mechanical castle?',
    options: ['Spirited Away', 'My Neighbor Totoro', 'Howl’s Moving Castle', 'Princess Mononoke'],
    correctIndex: 2,
    explanation: 'Howl’s Moving Castle was directed by Hayao Miyazaki in 2004.'
  },

  // --- Sport ---
  {
    id: 31,
    category: 'Sport',
    question: 'Which football country won the FIFA Men’s World Cup in Qatar 2022?',
    options: ['France', 'Argentina', 'Brazil', 'Croatia'],
    correctIndex: 1,
    explanation: 'Lionel Messi captained Argentina to victory in a thrilling final against France.'
  },
  {
    id: 32,
    category: 'Sport',
    question: 'In tennis, what term describes a score of zero?',
    options: ['Nil', 'Blank', 'Love', 'Duck'],
    correctIndex: 2,
    explanation: '"Love" in tennis is thought to originate from the French word "l’œuf" (egg, representing zero).'
  },
  {
    id: 33,
    category: 'Sport',
    question: 'How many players are on the pitch for one team in a standard rugby union match?',
    options: ['11', '13', '15', '18'],
    correctIndex: 2,
    explanation: 'A rugby union team fields 15 players (compared to 13 in rugby league).'
  },
  {
    id: 34,
    category: 'Sport',
    question: 'In basketball, how many points is a basket scored from behind the arc line worth?',
    options: ['1 point', '2 points', '3 points', '4 points'],
    correctIndex: 2,
    explanation: 'Shots made beyond the three-point arc score 3 points.'
  },
  {
    id: 35,
    category: 'Sport',
    question: 'Who holds the world record for the fastest 100m sprint at 9.58 seconds?',
    options: ['Tyson Gay', 'Usain Bolt', 'Carl Lewis', 'Noah Lyles'],
    correctIndex: 1,
    explanation: 'Usain Bolt of Jamaica set the 9.58s world record in Berlin in 2009.'
  },
  {
    id: 36,
    category: 'Sport',
    question: 'Which Grand Slam tennis tournament is played annually on grass courts in London?',
    options: ['Roland Garros', 'US Open', 'Wimbledon', 'Australian Open'],
    correctIndex: 2,
    explanation: 'Wimbledon is the world’s oldest tennis tournament, played on traditional grass.'
  },
  {
    id: 37,
    category: 'Sport',
    question: 'In Formula 1 racing, what color flag is waved to signal the winner has finished the race?',
    options: ['Green flag', 'Yellow flag', 'Chequered black and white', 'Red flag'],
    correctIndex: 2,
    explanation: 'The chequered flag signals the end of the race to the winner and competitors.'
  },
  {
    id: 38,
    category: 'Sport',
    question: 'In Olympic swimming, which stroke is performed lying on the back?',
    options: ['Breaststroke', 'Butterfly', 'Backstroke', 'Freestyle'],
    correctIndex: 2,
    explanation: 'Backstroke is the only regulated competitive stroke swam face-up.'
  },
  {
    id: 39,
    category: 'Sport',
    question: 'Which team won the 2023–24 English Premier League title?',
    options: ['Arsenal', 'Liverpool', 'Manchester City', 'Aston Villa'],
    correctIndex: 2,
    explanation: 'Manchester City won a historic fourth consecutive Premier League title.'
  },
  {
    id: 40,
    category: 'Sport',
    question: 'How many holes are played in a standard full round of professional golf?',
    options: ['9', '12', '18', '24'],
    correctIndex: 2,
    explanation: 'A regulation round of golf consists of 18 holes.'
  },

  // --- General Knowledge ---
  {
    id: 41,
    category: 'General Knowledge',
    question: 'What is the primary currency used in Japan?',
    options: ['Yuan', 'Won', 'Yen', 'Baht'],
    correctIndex: 2,
    explanation: 'The Japanese Yen (¥) is the official currency of Japan.'
  },
  {
    id: 42,
    category: 'General Knowledge',
    question: 'How many days are there in a standard leap year?',
    options: ['364', '365', '366', '367'],
    correctIndex: 2,
    explanation: 'A leap year adds February 29th, giving 366 total days.'
  },
  {
    id: 43,
    category: 'General Knowledge',
    question: 'Which Roman numeral represents the number 50?',
    options: ['V', 'X', 'L', 'C'],
    correctIndex: 2,
    explanation: 'In Roman numerals, L = 50, C = 100, D = 500, M = 1000.'
  },
  {
    id: 44,
    category: 'General Knowledge',
    question: 'What is the color of the middle stripe on the French national tricolor flag?',
    options: ['Blue', 'White', 'Red', 'Yellow'],
    correctIndex: 1,
    explanation: 'The French flag stripes from left to right are Blue, White, and Red.'
  },
  {
    id: 45,
    category: 'General Knowledge',
    question: 'What does the acronym "URL" stand for in web browsing?',
    options: ['Universal Resource Locator', 'Uniform Resource Locator', 'Unified Route Link', 'User Reference Line'],
    correctIndex: 1,
    explanation: 'URL stands for Uniform Resource Locator, the address of a web resource.'
  },
  {
    id: 46,
    category: 'General Knowledge',
    question: 'Which invention is credited to Alexander Graham Bell in 1876?',
    options: ['Light bulb', 'Telephone', 'Steam engine', 'Radio'],
    correctIndex: 1,
    explanation: 'Alexander Graham Bell was awarded the first US patent for the telephone.'
  },
  {
    id: 47,
    category: 'General Knowledge',
    question: 'In chess, which piece can only move diagonally?',
    options: ['Knight', 'Rook', 'Bishop', 'Pawn'],
    correctIndex: 2,
    explanation: 'Bishops move any number of vacant squares in diagonal directions.'
  },
  {
    id: 48,
    category: 'General Knowledge',
    question: 'What spice gives yellow curry its distinctive bright golden-yellow color?',
    options: ['Cinnamon', 'Turmeric', 'Paprika', 'Nutmeg'],
    correctIndex: 1,
    explanation: 'Turmeric contains curcumin, which produces a deep golden yellow color.'
  },
  {
    id: 49,
    category: 'General Knowledge',
    question: 'Which language has the most native speakers worldwide?',
    options: ['English', 'Mandarin Chinese', 'Spanish', 'Hindi'],
    correctIndex: 1,
    explanation: 'Mandarin Chinese has over 900 million native speakers.'
  },
  {
    id: 50,
    category: 'General Knowledge',
    question: 'What holiday is celebrated annually on December 25th?',
    options: ['Thanksgiving', 'Halloween', 'Christmas', 'New Year’s Day'],
    correctIndex: 2,
    explanation: 'Christmas Day is celebrated on December 25th around the globe!'
  },

  // --- Music ---
  {
    id: 51,
    category: 'Music',
    question: 'Which mega-pop star broke concert tour records worldwide with "The Eras Tour"?',
    options: ['Ariana Grande', 'Taylor Swift', 'Billie Eilish', 'Dua Lipa'],
    correctIndex: 1,
    explanation: 'Taylor Swift’s Eras Tour became the highest-grossing music tour in history.'
  },
  {
    id: 52,
    category: 'Music',
    question: 'How many strings does a standard acoustic or electric guitar have?',
    options: ['4', '5', '6', '8'],
    correctIndex: 2,
    explanation: 'A standard guitar is tuned to E-A-D-G-B-E and has 6 strings.'
  },
  {
    id: 53,
    category: 'Music',
    question: 'Which South Korean boy band is famous for hits like "Dynamite" and "Butter"?',
    options: ['Stray Kids', 'BTS', 'EXO', 'SEVENTEEN'],
    correctIndex: 1,
    explanation: 'BTS (Bangtan Sonyeondan) scored multiple Billboard Hot 100 number one hits.'
  },
  {
    id: 54,
    category: 'Music',
    question: 'What musical term instructs musicians to play or sing very softly?',
    options: ['Forte', 'Piano', 'Allegro', 'Crescendo'],
    correctIndex: 1,
    explanation: 'In musical dynamics, "piano" (p) means soft, and "forte" (f) means loud.'
  },
  {
    id: 55,
    category: 'Music',
    question: 'Who sang the 2024 viral pop summer smash "Espresso"?',
    options: ['Sabrina Carpenter', 'Olivia Rodrigo', 'Charli XCX', 'Chappell Roan'],
    correctIndex: 0,
    explanation: 'Sabrina Carpenter released "Espresso" in April 2024.'
  },
  {
    id: 56,
    category: 'Music',
    question: 'Which legendary British rock band recorded the album "Abbey Road"?',
    options: ['Queen', 'The Beatles', 'The Rolling Stones', 'Pink Floyd'],
    correctIndex: 1,
    explanation: 'The Beatles released Abbey Road in 1969 with its iconic zebra crossing cover.'
  },
  {
    id: 57,
    category: 'Music',
    question: 'What is the highest female singing voice type?',
    options: ['Alto', 'Mezzo-soprano', 'Soprano', 'Contralto'],
    correctIndex: 2,
    explanation: 'Soprano is the highest vocal range for female singers.'
  },
  {
    id: 58,
    category: 'Music',
    question: 'Which instrument family does the saxophone belong to?',
    options: ['Brass', 'Woodwind', 'Percussion', 'Strings'],
    correctIndex: 1,
    explanation: 'Although made of brass, the saxophone uses a single wooden reed and is classified as a woodwind.'
  },
  {
    id: 59,
    category: 'Music',
    question: 'Who is the Canadian artist behind hits like "Blinding Lights" and "Starboy"?',
    options: ['Drake', 'Justin Bieber', 'The Weeknd', 'Shawn Mendes'],
    correctIndex: 2,
    explanation: 'Abel Tesfaye, known professionally as The Weeknd, created "Blinding Lights".'
  },
  {
    id: 60,
    category: 'Music',
    question: 'Which famous holiday song starts with "You better watch out, you better not cry"?',
    options: ['Jingle Bells', 'Santa Claus Is Comin’ to Town', 'Winter Wonderland', 'Frosty the Snowman'],
    correctIndex: 1,
    explanation: '"Santa Claus Is Comin’ to Town" was written by J. Fred Coots and Haven Gillespie in 1934.'
  }
];

export function getDailyQuizQuestions(dateSeed: number): QuizQuestion[] {
  // Deterministically select 10 questions covering all 6 categories
  const categories: QuizQuestion['category'][] = [
    'Geography',
    'Science and Nature',
    'Entertainment',
    'Sport',
    'General Knowledge',
    'Music'
  ];

  const selected: QuizQuestion[] = [];
  const usedIds = new Set<number>();

  // Ensure at least 1 from each category
  categories.forEach((cat, idx) => {
    const pool = TEEN_QUIZ_QUESTIONS.filter(q => q.category === cat);
    if (pool.length > 0) {
      const pickIdx = Math.abs((dateSeed * 17 + idx * 31) % pool.length);
      const chosen = pool[pickIdx];
      selected.push(chosen);
      usedIds.add(chosen.id);
    }
  });

  // Fill the remaining 4 questions from the remaining pool
  const remaining = TEEN_QUIZ_QUESTIONS.filter(q => !usedIds.has(q.id));
  let step = 0;
  while (selected.length < 10 && remaining.length > 0) {
    const pickIdx = Math.abs((dateSeed * 37 + step * 43) % remaining.length);
    const chosen = remaining.splice(pickIdx, 1)[0];
    selected.push(chosen);
    usedIds.add(chosen.id);
    step++;
  }

  return selected;
}
