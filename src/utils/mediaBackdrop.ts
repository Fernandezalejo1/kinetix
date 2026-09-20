/** Match a uniform source background without cropping or recoloring the exercise. */
export function mediaBackdrop(corners: number[][]): string {
  if (corners.length < 4 || corners.some(c => c.length < 3 || c.some(v => !Number.isFinite(v)))) return "#0a0a0a";
  const rgb = [0, 1, 2].map(i => Math.round(corners.reduce((sum, c) => sum + c[i], 0) / corners.length));
  if (corners.some(c => c.slice(0, 3).some((v, i) => Math.abs(v - rgb[i]) > 28))) return "#0a0a0a";
  return `rgb(${rgb.join(", ")})`;
}
