// The released brand art (owner, 3 Nov 2026): the phoenix emblem (logo, favicon and the I5 square)
// and the five Coast pieces. The art itself lives in assets/brand/ and is All Rights Reserved
// (assets/README.md, NOTICE); this file only points the app at it. The build gives each file a
// hashed URL under /assets/.
import emblem from '../../../assets/brand/emblem.svg';
import lightDragonHead from '../../../assets/brand/pieces/light-dragon-head.svg';
import sun from '../../../assets/brand/pieces/sun.svg';
import dragonTail from '../../../assets/brand/pieces/dragon-tail.svg';
import moon from '../../../assets/brand/pieces/moon.svg';
import darkDragonHead from '../../../assets/brand/pieces/dark-dragon-head.svg';

/** The phoenix: a glowing egg with nine feathers on each wing, drawn upright (wings up). */
export const EMBLEM_URL: string = emblem;

/** One of the five Coast pieces as the brand art shows it. */
export interface CoastPieceArt {
  /** The piece id in rules/pieces/. */
  id: string;
  name: string;
  src: string;
  /** Its square on the Coast in a 2-player game (rules/boards/standard-9x9.json). */
  square: string;
  /** What it stands on in the board game. */
  base: 'round' | 'tetra';
}

/**
 * The Coast pieces in the order they stand on the Coast in a 2-player game, a1 to a9. The three
 * Dragon pieces stand on hollow tetrahedral bases that fit over the Center (e5) in the board game.
 */
export const COAST_PIECES: CoastPieceArt[] = [
  {
    id: 'light-dragon-head',
    name: 'Light Dragon Head',
    src: lightDragonHead,
    square: 'a1',
    base: 'tetra',
  },
  { id: 'sun', name: 'Sun', src: sun, square: 'a2', base: 'round' },
  { id: 'dragon-tail', name: 'Dragon Tail', src: dragonTail, square: 'a5', base: 'tetra' },
  { id: 'moon', name: 'Moon', src: moon, square: 'a8', base: 'round' },
  {
    id: 'dark-dragon-head',
    name: 'Dark Dragon Head',
    src: darkDragonHead,
    square: 'a9',
    base: 'tetra',
  },
];
