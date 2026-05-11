import { useEffect, useMemo, useState } from "react";

/**
 * Animated trading-themed background for the hero section.
 * - Animated candlestick chart (SVG)
 * - Moving line/area chart with gradient
 * - Floating ticker symbols with up/down arrows
 * Pure presentation, no external data.
 */
const HeroTradingAnimation = () => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  // Generate candles that shift left over time for live-feed feel
  const candles = useMemo(() => {
    const count = 28;
    const arr: { x: number; open: number; close: number; high: number; low: number }[] = [];
    let prev = 50;
    for (let i = 0; i < count; i++) {
      const drift = (Math.sin((i + tick) * 0.6) + Math.cos((i + tick) * 0.3)) * 6;
      const close = Math.max(15, Math.min(85, prev + drift + (Math.random() - 0.5) * 4));
      const open = prev;
      const high = Math.max(open, close) + Math.random() * 4;
      const low = Math.min(open, close) - Math.random() * 4;
      arr.push({ x: i, open, close, high, low });
      prev = close;
    }
    return arr;
  }, [tick]);

  const linePath = useMemo(() => {
    const points = Array.from({ length: 40 }, (_, i) => {
      const y = 50 + Math.sin((i + tick * 1.5) * 0.35) * 18 + Math.cos((i + tick) * 0.7) * 6;
      return `${(i / 39) * 100},${y}`;
    });
    return `M ${points.join(" L ")}`;
  }, [tick]);

  const areaPath = useMemo(() => {
    const points = Array.from({ length: 40 }, (_, i) => {
      const y = 50 + Math.sin((i + tick * 1.5) * 0.35) * 18 + Math.cos((i + tick) * 0.7) * 6;
      return `${(i / 39) * 100},${y}`;
    });
    return `M 0,100 L ${points.join(" L ")} L 100,100 Z`;
  }, [tick]);

  const tickers = [
    { sym: "BTC", val: "+2.4%", up: true, top: "12%", left: "8%", delay: "0s" },
    { sym: "ETH", val: "+1.1%", up: true, top: "70%", left: "4%", delay: "1.2s" },
    { sym: "GOLD", val: "-0.6%", up: false, top: "22%", left: "82%", delay: "0.6s" },
    { sym: "EURUSD", val: "+0.3%", up: true, top: "78%", left: "78%", delay: "1.8s" },
    { sym: "SOL", val: "+4.2%", up: true, top: "45%", left: "90%", delay: "2.4s" },
    { sym: "XAU", val: "-1.2%", up: false, top: "55%", left: "2%", delay: "3s" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Candlestick chart layer */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.18]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hero-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>

        {/* Faint grid lines */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            x2="100"
            y1={(i + 1) * (100 / 7)}
            y2={(i + 1) * (100 / 7)}
            stroke="hsl(var(--border))"
            strokeWidth="0.1"
          />
        ))}

        {/* Area + line chart */}
        <path d={areaPath} fill="url(#hero-area)" className="transition-all duration-1000 ease-out" />
        <path
          d={linePath}
          fill="none"
          stroke="url(#hero-line)"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Candlesticks layer */}
      <svg
        className="absolute inset-x-0 bottom-0 w-full h-1/2 opacity-[0.22]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {candles.map((c, i) => {
          const cw = 100 / candles.length;
          const x = i * cw + cw * 0.2;
          const w = cw * 0.6;
          const bullish = c.close <= c.open;
          const color = bullish ? "hsl(var(--primary))" : "hsl(var(--destructive))";
          const top = Math.min(c.open, c.close);
          const bot = Math.max(c.open, c.close);
          return (
            <g key={i} className="transition-all duration-1000 ease-out">
              <line
                x1={x + w / 2}
                x2={x + w / 2}
                y1={c.high}
                y2={c.low}
                stroke={color}
                strokeWidth="0.25"
              />
              <rect x={x} y={top} width={w} height={Math.max(0.8, bot - top)} fill={color} />
            </g>
          );
        })}
      </svg>

      {/* Floating ticker chips */}
      {tickers.map((t) => (
        <div
          key={t.sym}
          className="absolute hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/40 backdrop-blur-md border border-border/60 shadow-sm animate-float text-[11px] font-semibold"
          style={{ top: t.top, left: t.left, animationDelay: t.delay }}
        >
          <span className="text-foreground/80">{t.sym}</span>
          <span className={t.up ? "text-emerald-500" : "text-red-500"}>
            {t.up ? "▲" : "▼"} {t.val}
          </span>
        </div>
      ))}

      {/* Scanline shimmer */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent animate-pulse" />
    </div>
  );
};

export default HeroTradingAnimation;
