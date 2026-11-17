// A picture of the board in play, for sharing how a game was won (owner, 17 Nov 2026). Made in the
// browser from the board on screen and saved or handed to the share sheet: nothing is uploaded.

const WIDTH = 1200;
const HEIGHT = 630;
const BOARD = 570;
const GOLD = '#d6b25e';
const INK = '#f2ecd8';
const MUTED = '#a8a291';

/** What the card says beside the board. */
export interface Caption {
  /** The state of the game: "Checkmate · Dark wins". */
  headline: string;
  /** The ruleset and how long the game ran. */
  detail: string;
}

/** "Standard · 1 move", "Standard · 24 moves". */
export const detailLine = (ruleset: string, moves: number): string =>
  `${ruleset} · ${moves} ${moves === 1 ? 'move' : 'moves'}`;

/** The file name of a saved board image. */
export const BOARD_IMAGE_NAME = 'chess-nines-board.png';

/** Break text into lines no wider than `max`, by the width `measure` reports for a line. */
export function wrapLines(text: string, measure: (line: string) => number, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > max) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** A same-origin file as a data: address, which a picture drawn from SVG text may load. */
async function dataUrl(href: string): Promise<string> {
  const blob = await (await fetch(href)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** The board's SVG as a picture the canvas can draw, with its emblem inlined. */
async function boardPicture(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  copy.setAttribute('width', String(BOARD));
  copy.setAttribute('height', String(BOARD));
  // An SVG drawn as a picture loads nothing from the page, so the emblem travels inside it.
  for (const image of copy.querySelectorAll('image')) {
    const href = image.getAttribute('href');
    if (href) image.setAttribute('href', await dataUrl(href).catch(() => ''));
  }
  const text = new XMLSerializer().serializeToString(copy);
  const picture = new Image();
  picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  await picture.decode();
  return picture;
}

/** The card: the board on the left, the title, the result and the address on the right. */
export async function boardCard(svg: SVGSVGElement, caption: Caption): Promise<Blob> {
  const picture = await boardPicture(svg);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('No canvas');
  g.fillStyle = '#0f1116';
  g.fillRect(0, 0, WIDTH, HEIGHT);
  const top = (HEIGHT - BOARD) / 2;
  g.drawImage(picture, top, top, BOARD, BOARD);

  const left = top + BOARD + 40;
  const room = WIDTH - left - top;
  g.textBaseline = 'alphabetic';
  g.fillStyle = GOLD;
  g.font = "600 52px Georgia, 'Times New Roman', serif";
  g.fillText('CHESS NINES', left, 130);
  g.fillStyle = MUTED;
  g.font = "26px Georgia, 'Times New Roman', serif";
  g.fillText('A 9×9 chess variant', left, 172);

  g.fillStyle = INK;
  g.font = "600 40px Georgia, 'Times New Roman', serif";
  const lines = wrapLines(caption.headline, (l) => g.measureText(l).width, room);
  lines.slice(0, 4).forEach((l, i) => g.fillText(l, left, 300 + i * 52));
  g.fillStyle = MUTED;
  g.font = "26px Georgia, 'Times New Roman', serif";
  const detail = wrapLines(caption.detail, (l) => g.measureText(l).width, room);
  const below = 300 + Math.min(lines.length, 4) * 52 + 12;
  detail.slice(0, 2).forEach((l, i) => g.fillText(l, left, below + i * 36));

  g.fillStyle = GOLD;
  g.font = "600 30px Georgia, 'Times New Roman', serif";
  g.fillText('chess9s.com', left, HEIGHT - top - 4);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No image'))), 'image/png'),
  );
}

/** Hand the picture to the device's share sheet when it takes files, else save it as a file. */
export async function shareOrSave(blob: Blob, name = BOARD_IMAGE_NAME): Promise<void> {
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Chess Nines' });
      return;
    } catch (e) {
      // Closing the sheet is a choice, not a failure.
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
