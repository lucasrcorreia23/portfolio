import {
  PLATE_HEIGHT as H,
  PLATE_SCRIM,
  PLATE_WIDTH as W,
  plateHud,
} from "@/lib/plate";

type PlateHudProps = {
  name: string;
  index: number;
  client?: string;
  className?: string;
};

const MONO = "var(--font-geist-mono), ui-monospace, monospace";

/**
 * O HUD da placa em SVG, 16 por 10, por cima da montagem do case. Componente
 * de servidor: não custa JavaScript. As cores são os tokens, lidos por `var()`.
 */
export function PlateHud({ name, index, client, className }: PlateHudProps) {
  const hud = plateHud(name, index, client);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="plate-scrim-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--deep)" />
          <stop offset="1" stopColor="var(--deep)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="plate-scrim-bottom" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--deep)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--deep)" />
        </linearGradient>
      </defs>
      {/* As faixas escuras que seguram o texto sobre a imagem. */}
      <rect width={W} height={PLATE_SCRIM} fill="url(#plate-scrim-top)" />
      <rect
        y={H - PLATE_SCRIM}
        width={W}
        height={PLATE_SCRIM}
        fill="url(#plate-scrim-bottom)"
      />
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
      <text
        x="24"
        y="30"
        fill="var(--mist)"
        fontFamily={MONO}
        fontSize="7"
        letterSpacing="1.2"
      >
        {hud.index}
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
        {hud.client.toUpperCase()}
      </text>
      <text
        x="24"
        y={H - 16}
        fill="var(--mist)"
        fontFamily={MONO}
        fontSize="8"
        letterSpacing="1.4"
      >
        {hud.name.toUpperCase()}
      </text>
    </svg>
  );
}
