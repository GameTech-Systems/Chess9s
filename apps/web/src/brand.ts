// The released brand art (owner, 3 Nov 2026): the phoenix emblem (logo, favicon and the I5 square)
// and the five Coast pieces (raster WebP at 1x and 2x, made from the owner's PNGs in
// assets/brand/pieces/src/; D87). The art itself lives in assets/brand/ and is All Rights Reserved
// (assets/README.md, NOTICE); this file only points the app at it. The build gives each file a
// hashed URL under /assets/.
import emblem from '../../../assets/brand/emblem.svg';
import lightDragonHead from '../../../assets/brand/pieces/light-dragon-head-1x.webp';
import lightDragonHead2x from '../../../assets/brand/pieces/light-dragon-head-2x.webp';
import sun from '../../../assets/brand/pieces/sun-1x.webp';
import sun2x from '../../../assets/brand/pieces/sun-2x.webp';
import dragonTail from '../../../assets/brand/pieces/dragon-tail-1x.webp';
import dragonTail2x from '../../../assets/brand/pieces/dragon-tail-2x.webp';
import moon from '../../../assets/brand/pieces/moon-1x.webp';
import moon2x from '../../../assets/brand/pieces/moon-2x.webp';
import darkDragonHead from '../../../assets/brand/pieces/dark-dragon-head-1x.webp';
import darkDragonHead2x from '../../../assets/brand/pieces/dark-dragon-head-2x.webp';

/** The phoenix: a glowing egg with nine feathers on each wing, drawn upright (wings up). */
export const EMBLEM_URL: string = emblem;

/** One of the five Coast pieces as the brand art shows it. */
export interface CoastPieceArt {
  /** The piece id in rules/pieces/. */
  id: string;
  name: string;
  /** The 1x WebP (220×382). */
  src: string;
  /** `src` at 1x and the 440×764 file at 2x, for the img's srcset. */
  srcSet: string;
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
    srcSet: `${lightDragonHead} 1x, ${lightDragonHead2x} 2x`,
    square: 'a1',
    base: 'tetra',
  },
  {
    id: 'sun',
    name: 'Sun',
    src: sun,
    srcSet: `${sun} 1x, ${sun2x} 2x`,
    square: 'a2',
    base: 'round',
  },
  {
    id: 'dragon-tail',
    name: 'Dragon Tail',
    src: dragonTail,
    srcSet: `${dragonTail} 1x, ${dragonTail2x} 2x`,
    square: 'a5',
    base: 'tetra',
  },
  {
    id: 'moon',
    name: 'Moon',
    src: moon,
    srcSet: `${moon} 1x, ${moon2x} 2x`,
    square: 'a8',
    base: 'round',
  },
  {
    id: 'dark-dragon-head',
    name: 'Dark Dragon Head',
    src: darkDragonHead,
    srcSet: `${darkDragonHead} 1x, ${darkDragonHead2x} 2x`,
    square: 'a9',
    base: 'tetra',
  },
];
