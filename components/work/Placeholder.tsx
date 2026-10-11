import {
  PLACEHOLDER_HEIGHT as H,
  PLACEHOLDER_WIDTH as W,
  placeholderSpec,
} from "@/lib/placeholder";

type PlaceholderProps = {
  name: string;
  index: number;
  client?: string;
  className?: string;
};

const MONO = "var(--font-geist-mono), ui-monospace, monospace";

/**
 * A placa de placeholder em SVG, 16 por 10. Componente de servidor: não custa
 * JavaScript. As cores são os tokens, lidos por `var()`.
 */
export function Placeholder({ name, index, client, className }: PlaceholderProps) {
  const spec = placeholderSpec(name, index, client);
  const step = (W - 32) / (spec.ticks - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={name}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width={W} height={H} fill="var(--deep)" />
      <rect
        x="8"
        y="8"
        width={W - 16}
        height={H - 16}
        fill="none"
        stroke="var(--teal)"
        strokeWidth="0.75"
      />
      {/* As cruzes de registro, nos quatro cantos. */}
      {[
        [16, 16],
        [W - 16, 16],
        [16, H - 16],
        [W - 16, H - 16],
      ].map(([cx, cy]) => (
        <path
          key={`${cx}-${cy}`}
          d={`M${(cx ?? 0) - 3} ${cy}H${(cx ?? 0) + 3}M${cx} ${(cy ?? 0) - 3}V${(cy ?? 0) + 3}`}
          stroke="var(--mist)"
          strokeWidth="0.5"
          opacity="0.55"
        />
      ))}
      {/* A régua de baixo. */}
      {Array.from({ length: spec.ticks }, (_, i) => (
        <path
          key={i}
          d={`M${16 + i * step} ${H - 30}v${i % 4 === 0 ? -5 : -2.5}`}
          stroke="var(--teal)"
          strokeWidth="0.75"
        />
      ))}
      {/* As linhas de cota até o ponto de emissão. */}
      <path
        d={`M${spec.x} 24V${spec.y - spec.size - 4}M24 ${spec.y}H${spec.x - spec.size - 4}`}
        stroke="var(--teal)"
        strokeWidth="0.5"
        strokeDasharray="1.5 2.5"
      />
      <Emitter shape={spec.shape} x={spec.x} y={spec.y} size={spec.size} />
      <text
        x="24"
        y="30"
        fill="var(--mist)"
        fontFamily={MONO}
        fontSize="7"
        letterSpacing="1.2"
      >
        {spec.index}
      </text>
      <text
        x="40"
        y="30"
        fill="var(--mist)"
        fontFamily={MONO}
        fontSize="7"
        letterSpacing="1.2"
        opacity="0.7"
      >
        {spec.client.toUpperCase()}
      </text>
      <text
        x={W - 24}
        y="30"
        textAnchor="end"
        fill="var(--mist)"
        fontFamily={MONO}
        fontSize="5"
        letterSpacing="0.9"
        opacity="0.7"
      >
        {spec.readout}
      </text>
      <text
        x="24"
        y={H - 16}
        fill="var(--mist)"
        fontFamily={MONO}
        fontSize="8"
        letterSpacing="1.4"
      >
        {spec.name.toUpperCase()}
      </text>
    </svg>
  );
}

function Emitter({
  shape,
  x,
  y,
  size,
}: {
  shape: string;
  x: number;
  y: number;
  size: number;
}) {
  const fill = "var(--cyan)";
  if (shape === "ring") {
    return (
      <circle cx={x} cy={y} r={size} fill="none" stroke={fill} strokeWidth="1.4" />
    );
  }
  if (shape === "bar") {
    return (
      <rect x={x - size * 1.6} y={y - 1} width={size * 3.2} height="2" fill={fill} />
    );
  }
  if (shape === "cross") {
    return (
      <path
        d={`M${x - size} ${y}H${x + size}M${x} ${y - size}V${y + size}`}
        stroke={fill}
        strokeWidth="1.4"
      />
    );
  }
  return <circle cx={x} cy={y} r={size * 0.6} fill={fill} />;
}
