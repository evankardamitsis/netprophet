/**
 * The animated lockup (the app's BouncingLogo, in CSS): the «net» lockup without its ball, and the ball rallying
 * over the net, landing as the next sport's ball (tennis, padel, basketball, football), a hint that more sports come.
 * Lockup viewBox "8 11 426.4 80": the ball rests at (66, 26), radius 15.
 */
export function Logo({ height = 30 }: { height?: number }) {
  const width = (height * 426.4) / 80;
  return (
    <span className="logo" style={{ width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-on-ink-noball.svg" alt="NetProphet" width={width} height={height} />
      <span className="logo-ball" style={{ width: height * 0.375, height: height * 0.375 }} />
    </span>
  );
}
