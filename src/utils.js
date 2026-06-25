export function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  const rand = seededRandom(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderDatasets(text, seed, qIdx) {
  return text.replace(/\{\{DATA:([\d,]+)\}\}/g, (_, nums) => {
    const arr = nums.split(',').map(Number);
    const shuffled = shuffleWithSeed(arr, seed + qIdx * 31337 + 99991);
    return shuffled.map((n) => (n >= 1000 ? n.toLocaleString('en-PH') : String(n))).join(',  ');
  });
}

export function parseChoices(choices) {
  return typeof choices === 'string' ? JSON.parse(choices) : choices;
}
