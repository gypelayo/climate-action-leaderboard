export default function Globe() {
  return (
    <div className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20">
      {/* Outer orbit rings */}
      <div
        className="animate-orbit absolute inset-[-10px] rounded-full border border-cyan-400/10"
        style={{ borderTopColor: "rgba(0,229,255,0.35)" }}
      />
      <div
        className="animate-orbit-rev absolute inset-[-18px] rounded-full border border-cyan-400/05"
        style={{ borderBottomColor: "rgba(0,229,255,0.2)" }}
      />

      {/* Globe sphere */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 38% 32%, #1a4a72 0%, #0a1e40 45%, #000820 100%)",
          boxShadow:
            "0 0 28px rgba(0,180,255,0.2), inset 0 0 24px rgba(0,60,120,0.4)",
        }}
      >
        {/* Latitude/longitude grid */}
        <svg
          viewBox="0 0 80 80"
          className="absolute inset-0 w-full h-full opacity-40"
        >
          <circle cx="40" cy="40" r="39" fill="none" stroke="#00e5ff" strokeWidth="0.4" />
          <ellipse cx="40" cy="40" rx="39" ry="13" fill="none" stroke="#00e5ff" strokeWidth="0.35" />
          <ellipse cx="40" cy="40" rx="39" ry="26" fill="none" stroke="#00e5ff" strokeWidth="0.25" />
          <line x1="40" y1="1" x2="40" y2="79" stroke="#00e5ff" strokeWidth="0.4" />
          <line x1="1"  y1="40" x2="79" y2="40" stroke="#00e5ff" strokeWidth="0.4" />
          <line x1="14" y1="9"  x2="66" y2="71" stroke="#00e5ff" strokeWidth="0.2" />
          <line x1="66" y1="9"  x2="14" y2="71" stroke="#00e5ff" strokeWidth="0.2" />
        </svg>

        {/* Scanning line */}
        <div
          className="animate-globe-scan absolute inset-x-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0,229,255,0.9) 50%, transparent)",
          }}
        />

        {/* Atmosphere rim glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 58%, rgba(0,140,255,0.18) 100%)",
          }}
        />
      </div>

      {/* Pulsing centre dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-1 h-1 rounded-full bg-cyan-300 animate-pulse-dot"
          style={{ color: "#00e5ff" }}
        />
      </div>
    </div>
  );
}
