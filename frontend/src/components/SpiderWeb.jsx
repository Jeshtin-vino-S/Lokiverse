// Corner spider web. Put inside a position:relative parent: <SpiderWeb /> or <SpiderWeb side="right" />
export default function SpiderWeb({ side = "left" }) {
  const spokes = [0, 15, 30, 45, 60, 75, 90].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return `M0 0 L${(Math.cos(a) * 220).toFixed(1)} ${(Math.sin(a) * 220).toFixed(1)}`;
  });
  const arcs = [45, 85, 125, 165, 205].map((r) => {
    const pts = [0, 15, 30, 45, 60, 75, 90].map((d) => {
      const a = (d * Math.PI) / 180;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {      // sagging curve between spokes
      const [px, py] = pts[i - 1], [x, y] = pts[i];
      const cx = (px + x) / 2 * 0.86, cy = (py + y) / 2 * 0.86;
      d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  });
  return (
    <svg className={`fx-web ${side === "right" ? "fx-web--right" : ""}`} viewBox="0 0 220 220" aria-hidden="true">
      {[...spokes, ...arcs].map((d, i) => <path key={i} d={d} pathLength="1" />)}
    </svg>
  );
}

