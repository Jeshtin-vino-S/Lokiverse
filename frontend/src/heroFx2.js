// import { fireArrow, slash } from './heroFx2'

// HAWKEYE: arrow flies from the left edge to the target (e.g. the notification bell)
export function fireArrow(target) {
  if (typeof window === "undefined" || !target) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hit = () => {
    target.classList.remove("fx-hit");
    void target.offsetWidth;
    target.classList.add("fx-hit");
    target.addEventListener("animationend", () => target.classList.remove("fx-hit"), { once: true });
  };
  if (reduce) return hit();

  const r = target.getBoundingClientRect();
  const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
  const startX = -100, startY = ty + 80;
  const angle = Math.atan2(ty - startY, tx - startX) * 180 / Math.PI;

  const a = document.createElement("div");
  a.className = "fx-arrow";
  document.body.appendChild(a);
  const anim = a.animate(
    [
      { transform: `translate(${startX}px,${startY}px) rotate(${angle}deg)` },
      { transform: `translate(${tx - 90}px,${ty}px) rotate(${angle}deg)` },
    ],
    { duration: 450, easing: "cubic-bezier(.2,.6,.3,1)", fill: "forwards" }
  );
  anim.onfinish = () => {
    a.remove();
    hit();
  };
}

// BLACK PANTHER: claw slash across an element (needs class "fx-claw" on it)
export function slash(el) {
  if (!el) return;
  el.classList.remove("is-slashed");
  void el.offsetWidth;
  el.classList.add("is-slashed");
  setTimeout(() => el.classList.remove("is-slashed"), 500);
}

