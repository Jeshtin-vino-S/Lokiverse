import { useTheme } from "../context/ThemeContext";

const AvengersBackground = () => {
  const { isDark } = useTheme();

  if (!isDark) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-colors duration-300">
        {/* Crisp Clean White Base */}
        <div className="absolute inset-0 bg-[#f8fafc]" />

        {/* Soft Pristine Celestial Lighting (Gentle Emerald & Amber Gold Accents) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_12%,rgba(16,185,129,0.08)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_75%,rgba(251,191,36,0.07)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,165,233,0.05)_0%,transparent_55%)]" />

        {/* Subtle Top & Bottom Gradient for Visual Depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-slate-200/40" />

        {/* Subtle Grid */}
        <div className="absolute inset-0 avengers-grid-overlay-light opacity-60" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-colors duration-300">
      {/* Deep Obsidian Cosmic Base */}
      <div className="absolute inset-0 bg-[#05070d]" />

      {/* Gentle Celestial Aurora Lighting (Lokiverse Emerald & Subtle Amber Gold) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_15%,rgba(16,185,129,0.14)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_80%,rgba(251,191,36,0.08)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,165,233,0.06)_0%,transparent_60%)]" />

      {/* Cinematic Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />

      {/* Multiverse Sacred Timeline Grid */}
      <div className="absolute inset-0 avengers-grid-overlay opacity-30" />
    </div>
  );
};

export default AvengersBackground;
