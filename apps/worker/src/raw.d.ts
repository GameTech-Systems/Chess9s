// Vite (and so Vitest) imports a file's text with `?raw`; the tests read public/_headers this way.
declare module '*?raw' {
  const text: string;
  export default text;
}
