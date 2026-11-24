// Lightweight inline icon set (stroke icons). Server-component safe.
const paths = {
  ledger: ["M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z", "M9 8h6", "M9 12h6"],
  echo: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  pulse: ["M3 4h18v18H3z", "M16 2v4", "M8 2v4", "M3 10h18"],
  stock: ["M21 8l-9-5-9 5v8l9 5 9-5z", "M3 8l9 5 9-5", "M12 13v8"],
  reach: ["M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z", "M15 9a4 4 0 0 1 0 6", "M18 6.5a8 8 0 0 1 0 11"],
  insight: ["M3 3v18h18", "M7 15v3", "M12 9v9", "M17 5v13"],
  spark: ["M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
  user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  building: ["M4 21V5l8-2 8 2v16", "M9 21v-4h6v4", "M8 9h.01", "M12 9h.01", "M16 9h.01", "M8 13h.01", "M12 13h.01", "M16 13h.01"],
  mail: ["M3 5h18v14H3z", "M3 7l9 6 9-6"],
  arrow: ["M7 17L17 7", "M8 7h9v9"]
} satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const list: readonly string[] = paths[name];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {list.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
