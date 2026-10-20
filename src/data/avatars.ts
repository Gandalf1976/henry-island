import { AvatarDef } from '../types';

export const AVATAR_ROSTER: AvatarDef[] = [
  {
    id: 'santa_hat_kid',
    name: 'Santa Explorer',
    emoji: '🎅',
    color: '#e63946',
    hatColor: '#c1121f',
    description: 'Festive red coat & Santa hat, always ready for island adventures!'
  },
  {
    id: 'festive_elf',
    name: 'Holiday Elf',
    emoji: '🧝',
    color: '#2a9d8f',
    hatColor: '#1b4332',
    description: 'Green tunic, pointy ears, and cheerful winter energy!'
  },
  {
    id: 'cozy_reindeer',
    name: 'Snow Reindeer',
    emoji: '🦌',
    color: '#bc6c25',
    hatColor: '#8b4513',
    description: 'Antler beanie & warm brown knitted coat!'
  },
  {
    id: 'island_penguin',
    name: 'Waddle Penguin',
    emoji: '🐧',
    color: '#1d3557',
    hatColor: '#e76f51',
    description: 'Little waddling snow expert with a bright orange scarf!'
  },
  {
    id: 'polar_bear',
    name: 'Polar Scout',
    emoji: '🐻‍❄️',
    color: '#457b9d',
    hatColor: '#a8dadc',
    description: 'Fluffy white winter coat with a warm turquoise bobble hat!'
  },
  {
    id: 'gingerbread_pal',
    name: 'Gingerbread Baker',
    emoji: '🍪',
    color: '#d4a373',
    hatColor: '#e63946',
    description: 'Sweet cinnamon vibes with royal icing buttons!'
  }
];

export const DEFAULT_FAMILY_MEMBERS = [
  { name: 'Dad', avatarId: 'santa_hat_kid' },
  { name: 'Mum', avatarId: 'festive_elf' },
  { name: 'Teen 1', avatarId: 'island_penguin' },
  { name: 'Teen 2', avatarId: 'cozy_reindeer' }
];
