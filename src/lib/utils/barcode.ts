const code39: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "*": "nwnnwnwnn",
};

export function barcodeSvg(value: string): string {
  const text = `*${value.toUpperCase().replace(/[^0-9A-Z .\-]/g, "")}*`;
  let x = 0;
  const bars: string[] = [];
  for (const [index, char] of [...text].entries()) {
    const pattern = code39[char];
    if (!pattern) {
      continue;
    }
    for (const [barIndex, width] of [...pattern].entries()) {
      const size = width === "w" ? 3 : 1;
      if (barIndex % 2 === 0) {
        bars.push(`<rect x="${x}" y="0" width="${size}" height="48" fill="#000"/>`);
      }
      x += size;
    }
    if (index < text.length - 1) {
      x += 1;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} 48" width="${x * 2}" height="48" role="img" aria-label="${value}">${bars.join("")}</svg>`;
}
