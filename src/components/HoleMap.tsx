"use client";

import { useId, useMemo } from "react";
import { buildHoleLayout, plotShots } from "@/lib/golf/layout";
import type { MapShot } from "@/lib/golf/mapping";

type Props = {
  seed: number;
  par: number;
  shots: MapShot[];
  /** Draw the finishing putt into the cup once the hole is complete. */
  holedOut?: boolean;
  className?: string;
  /** Hide labels and trees for the small cards on the scorecard. */
  compact?: boolean;
};

/**
 * A drawn hole with the day's shots plotted on it. The layout comes straight
 * from the hole's seed, so it is identical for everyone looking at the hole.
 */
export default function HoleMap({ seed, par, shots, holedOut = false, className, compact = false }: Props) {
  const uid = useId().replace(/:/g, "");
  const { layout, plotted } = useMemo(() => {
    const layout = buildHoleLayout(seed, par);
    return { layout, plotted: plotShots(layout, shots, seed) };
  }, [seed, par, shots]);

  const last = plotted[plotted.length - 1];
  const pin = layout.green;

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={className}
      role="img"
      aria-label={`Hole map, par ${par}, ${plotted.length} shot${plotted.length === 1 ? "" : "s"} played`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`rough-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#01402d" />
          <stop offset="100%" stopColor="#022c20" />
        </linearGradient>
        <linearGradient id={`fairway-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f8a6a" />
          <stop offset="100%" stopColor="#1e7355" />
        </linearGradient>
        <radialGradient id={`green-${uid}`}>
          <stop offset="0%" stopColor="#8fd8a8" />
          <stop offset="100%" stopColor="#4fae7c" />
        </radialGradient>
      </defs>

      <rect width={layout.width} height={layout.height} fill={`url(#rough-${uid})`} />

      {!compact &&
        Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x={0}
            y={(i * layout.height) / 12}
            width={layout.width}
            height={layout.height / 24}
            fill="#ffffff"
            opacity={0.025}
          />
        ))}

      {layout.water && <path d={layout.water} fill="#1d6fa5" opacity={0.85} />}

      <path
        d={layout.centreLine}
        stroke={`url(#fairway-${uid})`}
        strokeWidth={layout.fairwayWidth}
        strokeLinecap="round"
        fill="none"
      />

      {layout.bunkers.map((bunker, i) => (
        <ellipse
          key={i}
          cx={bunker.x}
          cy={bunker.y}
          rx={bunker.rx}
          ry={bunker.ry}
          transform={`rotate(${bunker.rotate} ${bunker.x} ${bunker.y})`}
          fill="#e8dcb5"
          stroke="#c9b787"
          strokeWidth={0.5}
        />
      ))}

      {!compact &&
        layout.trees.map((tree, i) => (
          <g key={i}>
            <circle cx={tree.x} cy={tree.y + 0.8} r={tree.r} fill="#000000" opacity={0.18} />
            <circle cx={tree.x} cy={tree.y} r={tree.r} fill="#0a5138" />
            <circle cx={tree.x - tree.r * 0.25} cy={tree.y - tree.r * 0.25} r={tree.r * 0.5} fill="#156d4a" />
          </g>
        ))}

      <ellipse
        cx={pin.x}
        cy={pin.y}
        rx={layout.greenRx}
        ry={layout.greenRy}
        fill={`url(#green-${uid})`}
        stroke="#e7dfc9"
        strokeWidth={0.6}
        opacity={0.95}
      />

      <rect
        x={layout.tee.x - 5}
        y={layout.tee.y - 3}
        width={10}
        height={6}
        rx={1.5}
        fill="#e8dcb5"
        stroke="#c9b787"
        strokeWidth={0.5}
      />

      {plotted.map((shot) => (
        <line
          key={`t-${shot.index}`}
          x1={shot.fromX}
          y1={shot.fromY}
          x2={shot.x}
          y2={shot.y}
          stroke="#FAD02E"
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}

      {holedOut && last && (
        <line
          x1={last.x}
          y1={last.y}
          x2={pin.x}
          y2={pin.y}
          stroke="#FAD02E"
          strokeWidth={1.2}
          strokeDasharray="2 2.5"
          strokeLinecap="round"
          opacity={0.75}
        />
      )}

      {plotted.map((shot) => (
        <g key={`s-${shot.index}`}>
          <circle cx={shot.x} cy={shot.y} r={compact ? 3 : 4} fill="#012017" opacity={0.35} />
          <circle
            cx={shot.x}
            cy={shot.y}
            r={compact ? 2.6 : 3.6}
            fill={shots[shot.index]?.color ?? "#FAD02E"}
            stroke="#012017"
            strokeWidth={0.5}
          />
          {!compact && (
            <text x={shot.x} y={shot.y + 1.5} textAnchor="middle" fontSize={4} fontWeight={700} fill="#012017">
              {shot.index + 1}
            </text>
          )}
        </g>
      ))}

      <g>
        <line x1={pin.x} y1={pin.y} x2={pin.x} y2={pin.y - 13} stroke="#f7f3e8" strokeWidth={0.9} />
        <path d={`M ${pin.x} ${pin.y - 13} L ${pin.x + 8} ${pin.y - 10.5} L ${pin.x} ${pin.y - 8} Z`} fill="#FAD02E" />
        <circle cx={pin.x} cy={pin.y} r={1.5} fill="#012017" />
      </g>
    </svg>
  );
}
