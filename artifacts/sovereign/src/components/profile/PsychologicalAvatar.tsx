import { useMemo } from 'react';

interface PsychologicalAvatarProps {
  factors: {
    workRatio: number;        // 0-100
    audienceRatio: number;    // 0-100
    directRatio: number;      // 0-100
    responseRate: number;     // 0-100
    sentRatio: number;        // 0-1: who initiates
    peakHour: number;         // 0-23
    directCircleSize: number; // count
    consumptionRate: number;  // 0-100 % of limit used
  };
  size?: number;
  animate?: boolean;
}

/**
 * Generates an abstract geometric avatar based on user behavior.
 * Pure SVG — deterministic output from input factors.
 */
export default function PsychologicalAvatar({ factors, size = 80, animate = true }: PsychologicalAvatarProps) {
  const { paths, hue, layers } = useMemo(() => {
    // Map factors → visual properties
    const goldHue = 42; // Exclusive Gold base
    // Hue shifts slightly based on dominant inbox category (work=blue-ish offset, direct=warm gold, audience=violet-ish)
    const dominant = Math.max(factors.workRatio, factors.audienceRatio, factors.directRatio);
    let hueShift = goldHue;
    if (factors.directRatio === dominant) hueShift = 42;       // gold
    else if (factors.workRatio === dominant) hueShift = 210;   // blue
    else hueShift = 270;                                        // violet

    // Number of layers: 3-6 based on directCircleSize (rare = more layers)
    const layerCount = Math.min(6, 3 + Math.floor(factors.directCircleSize / 3));

    // Number of vertices on the polygon (5-9) based on responseRate
    const vertices = 5 + Math.floor((factors.responseRate / 100) * 4);

    // Rotation skew based on peak hour
    const rotation = (factors.peakHour / 24) * 360;

    // Shape "energy" — initiator vs reactive (sentRatio): higher → more pointed/sharp
    const sharpness = 0.5 + factors.sentRatio * 0.5;

    // Generate concentric polygons
    const cx = 50;
    const cy = 50;
    const generated: { d: string; opacity: number; r: number }[] = [];

    for (let i = 0; i < layerCount; i++) {
      const baseR = 18 + i * 5;
      const points: string[] = [];
      for (let v = 0; v < vertices; v++) {
        const angle = (v / vertices) * Math.PI * 2 + (rotation * Math.PI / 180) + (i * 0.15);
        // alternate radius for "star" effect proportional to sharpness
        const r = baseR * (v % 2 === 0 ? 1 : sharpness);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      generated.push({
        d: `M ${points.join(' L ')} Z`,
        opacity: 0.08 + (i / layerCount) * 0.4,
        r: baseR,
      });
    }

    return { paths: generated, hue: hueShift, layers: layerCount };
  }, [factors]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={animate ? 'animate-pulse-subtle' : ''}
      style={{ filter: `drop-shadow(0 4px 12px hsl(${hue} 70% 50% / 0.3))` }}
    >
      <defs>
        <radialGradient id={`grad-${hue}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`hsl(${hue} 80% 65%)`} stopOpacity="0.9" />
          <stop offset="100%" stopColor={`hsl(${hue} 70% 35%)`} stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* Outer glow ring */}
      <circle cx="50" cy="50" r="48" fill="none" stroke={`hsl(${hue} 70% 50% / 0.2)`} strokeWidth="0.5" />

      {/* Layered polygons — represents user complexity */}
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={i === paths.length - 1 ? `url(#grad-${hue})` : 'none'}
          stroke={`hsl(${hue} 70% 55%)`}
          strokeWidth={i === paths.length - 1 ? 0 : 0.6}
          opacity={p.opacity}
        />
      ))}

      {/* Central core — represents identity */}
      <circle cx="50" cy="50" r="4" fill={`hsl(${hue} 80% 60%)`} />
      <circle cx="50" cy="50" r="8" fill="none" stroke={`hsl(${hue} 80% 60%)`} strokeWidth="0.3" opacity="0.6" />
    </svg>
  );
}
