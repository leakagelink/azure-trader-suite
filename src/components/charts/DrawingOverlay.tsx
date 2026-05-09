import { useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, Time } from "lightweight-charts";
import type { DrawingLine, DrawingMode } from "@/hooks/useChartDrawings";

interface Props {
  chart: IChartApi | null;
  series: ISeriesApi<"Candlestick"> | null;
  containerRef: React.RefObject<HTMLDivElement>;
  mode: DrawingMode;
  color: string;
  drawings: DrawingLine[];
  setDrawings: React.Dispatch<React.SetStateAction<DrawingLine[]>>;
}

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#a855f7"];

export default function DrawingOverlay({
  chart,
  series,
  containerRef,
  mode,
  color,
  drawings,
  setDrawings,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftRef = useRef<DrawingLine | null>(null);
  const drawingIdRef = useRef<string | null>(null);

  // resize canvas
  useEffect(() => {
    const c = canvasRef.current;
    const cont = containerRef.current;
    if (!c || !cont) return;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      c.width = cont.clientWidth * dpr;
      c.height = cont.clientHeight * dpr;
      c.style.width = `${cont.clientWidth}px`;
      c.style.height = `${cont.clientHeight}px`;
      const ctx = c.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(cont);
    return () => ro.disconnect();
  }, [containerRef]);

  // render loop
  useEffect(() => {
    if (!chart || !series) return;
    let raf = 0;
    const render = () => {
      const c = canvasRef.current;
      const cont = containerRef.current;
      if (!c || !cont) {
        raf = requestAnimationFrame(render);
        return;
      }
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, cont.clientWidth, cont.clientHeight);

      const ts = chart.timeScale();
      const toX = (time: number) => ts.timeToCoordinate(time as Time);
      const toY = (price: number) => series.priceToCoordinate(price);

      const all = draftRef.current ? [...drawings, draftRef.current] : drawings;

      for (const d of all) {
        ctx.strokeStyle = d.color;
        ctx.fillStyle = d.color;
        ctx.lineWidth = d.lineWidth;
        ctx.beginPath();

        if (d.type === "hline" && d.points[0]) {
          const y = toY(d.points[0].price);
          if (y == null) continue;
          ctx.moveTo(0, y);
          ctx.lineTo(cont.clientWidth, y);
          ctx.stroke();
        } else if (d.type === "vline" && d.points[0]) {
          const x = toX(d.points[0].time);
          if (x == null) continue;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, cont.clientHeight);
          ctx.stroke();
        } else if (d.type === "trendline" && d.points.length >= 2) {
          const x1 = toX(d.points[0].time);
          const y1 = toY(d.points[0].price);
          const x2 = toX(d.points[1].time);
          const y2 = toY(d.points[1].price);
          if (x1 == null || y1 == null || x2 == null || y2 == null) continue;
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else if (d.type === "rectangle" && d.points.length >= 2) {
          const x1 = toX(d.points[0].time);
          const y1 = toY(d.points[0].price);
          const x2 = toX(d.points[1].time);
          const y2 = toY(d.points[1].price);
          if (x1 == null || y1 == null || x2 == null || y2 == null) continue;
          ctx.globalAlpha = 0.15;
          ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
          ctx.globalAlpha = 1;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        } else if (d.type === "fib" && d.points.length >= 2) {
          const x1 = toX(d.points[0].time);
          const x2 = toX(d.points[1].time);
          const p1 = d.points[0].price;
          const p2 = d.points[1].price;
          if (x1 == null || x2 == null) continue;
          const left = Math.min(x1, x2);
          const right = Math.max(x1, x2, cont.clientWidth);
          FIB_LEVELS.forEach((lvl, i) => {
            const price = p1 + (p2 - p1) * lvl;
            const y = toY(price);
            if (y == null) return;
            ctx.strokeStyle = FIB_COLORS[i];
            ctx.fillStyle = FIB_COLORS[i];
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.stroke();
            ctx.font = "11px sans-serif";
            ctx.fillText(`${lvl}  ${price.toFixed(2)}`, left + 4, y - 2);
          });
        } else if (d.type === "brush" && d.points.length >= 2) {
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          d.points.forEach((p, i) => {
            const x = toX(p.time);
            const y = toY(p.price);
            if (x == null || y == null) return;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        } else if (d.type === "text" && d.points[0]) {
          const x = toX(d.points[0].time);
          const y = toY(d.points[0].price);
          if (x == null || y == null) continue;
          ctx.font = "13px sans-serif";
          ctx.fillText(d.text || "Text", x, y);
        }
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [chart, series, drawings, containerRef]);

  // pointer events
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !chart || !series) return;
    if (mode === "cursor") return;

    const ts = chart.timeScale();
    const fromEvt = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const time = ts.coordinateToTime(x);
      const price = series.coordinateToPrice(y);
      if (time == null || price == null) return null;
      return { time: Number(time), price: Number(price) };
    };

    const onDown = (e: PointerEvent) => {
      const pt = fromEvt(e);
      if (!pt) return;
      c.setPointerCapture(e.pointerId);
      const id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      drawingIdRef.current = id;

      if (mode === "eraser") {
        // remove top-most drawing near point
        const rect = c.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        setDrawings((prev) => {
          for (let i = prev.length - 1; i >= 0; i--) {
            const d = prev[i];
            const hit = d.points.some((p) => {
              const x = ts.timeToCoordinate(p.time as Time);
              const y = series.priceToCoordinate(p.price);
              if (x == null || y == null) return false;
              return Math.hypot(x - px, y - py) < 14;
            });
            if (hit) return prev.filter((_, k) => k !== i);
          }
          return prev;
        });
        return;
      }

      if (mode === "hline" || mode === "vline") {
        setDrawings((prev) => [
          ...prev,
          { id, type: mode, points: [pt], color, lineWidth: 1.5 },
        ]);
        drawingIdRef.current = null;
        return;
      }

      if (mode === "text") {
        const text = window.prompt("Text:", "Note");
        if (text) {
          setDrawings((prev) => [
            ...prev,
            { id, type: "text", points: [pt], color, lineWidth: 1, text },
          ]);
        }
        drawingIdRef.current = null;
        return;
      }

      draftRef.current = {
        id,
        type: mode,
        points: mode === "brush" ? [pt] : [pt, pt],
        color,
        lineWidth: mode === "brush" ? 2.5 : 1.5,
      };
    };

    const onMove = (e: PointerEvent) => {
      if (!draftRef.current) return;
      const pt = fromEvt(e);
      if (!pt) return;
      if (mode === "brush") {
        draftRef.current.points.push(pt);
      } else {
        draftRef.current.points[1] = pt;
      }
    };

    const onUp = () => {
      if (draftRef.current) {
        const d = draftRef.current;
        draftRef.current = null;
        setDrawings((prev) => [...prev, d]);
      }
      drawingIdRef.current = null;
    };

    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("pointercancel", onUp);
    return () => {
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerup", onUp);
      c.removeEventListener("pointercancel", onUp);
    };
  }, [chart, series, mode, color, setDrawings]);

  const interactive = mode !== "cursor";
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{
        pointerEvents: interactive ? "auto" : "none",
        cursor: interactive ? "crosshair" : "default",
        touchAction: interactive ? "none" : "auto",
      }}
    />
  );
}
