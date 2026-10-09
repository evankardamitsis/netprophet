/** Parse a CSS `cubic-bezier(a,b,c,d)` string (as used in @netprophet/tokens) into its four numbers. */
export function parseBezier(css: string): [number, number, number, number] {
  const m = /cubic-bezier\(\s*([^)]+)\)/.exec(css);
  const nums = m?.[1]?.split(',').map((n) => Number(n.trim())) ?? [];
  if (nums.length !== 4 || nums.some((n) => Number.isNaN(n))) {
    throw new Error(`Not a cubic-bezier: ${css}`);
  }
  return [nums[0]!, nums[1]!, nums[2]!, nums[3]!];
}
