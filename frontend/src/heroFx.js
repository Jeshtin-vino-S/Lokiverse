// Helper functions for Avengers Hero FX
// import { strikeThunder, smash, shield, snapAndRemove } from './heroFx'

// THOR: lightning from the top of the screen to a point (e.g. Like / Transmit button)
export function strikeThunder(target) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!target) return;
  const r = target.getBoundingClientRect();
  const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  const W = window.innerWidth;
  const pts = [];
  let x = tx + (Math.random() - 0.5) * 220, y = 0;
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    pts.push(`${x},${y}`);
    y += (ty - y) / (steps - i + 1) * (0.9 + Math.random() * 0.4);
    x += (tx - x) / (steps - i + 1) + (Math.random() - 0.5) * 60;
  }
  pts.push(`${tx},${ty}`);
  const box = document.createElement("div");
  box.className = "fx-thunder";
  box.innerHTML =
    `<svg viewBox="0 0 ${W} ${window.innerHeight}" preserveAspectRatio="none" aria-hidden="true">` +
    `<polyline pathLength="1" points="${pts.join(" ")}"/></svg>`;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 600);
}

// generic "add class, restart animation, remove after animation"
function flash(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // restart animation
  el.classList.add(cls);
  el.addEventListener("animationend", () => el.classList.remove(cls), { once: true });
}

export const smash = (el) => flash(el, "fx-smash"); // HULK : errors / delete confirm
export const shield = (el) => flash(el, "fx-shield"); // CAP : follow / assemble success

// THANOS: fade the element away, then call onDone (e.g. remove post/transmission from state)
export function snapAndRemove(el, onDone) {
  if (!el) {
    if (onDone) onDone();
    return;
  }
  el.classList.add("fx-snap");
  el.addEventListener(
    "animationend",
    () => {
      if (onDone) onDone();
    },
    { once: true }
  );
}

