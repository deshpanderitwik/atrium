// Ported from Atrium/Sources/Theme/Theme.swift — warm vellum-dark palette,
// EB Garamond serif throughout, monospace for structural labels.

export const colors = {
  paper: "#14110d",
  paperWarm: "#1d1812",
  paperDeep: "#110e0a",
  ink: "#e6d9bc",
  inkSoft: "#a89a7d",
  inkFaint: "#6e6451",
  rule: "#322a20",
  oxblood: "#c97468",
} as const;

// Font family names as registered in app/_layout.tsx via expo-font.
export const fonts = {
  regular: "EBGaramond-Regular",
  medium: "EBGaramond-Medium",
  italic: "EBGaramond-Italic",
  mediumItalic: "EBGaramond-MediumItalic",
} as const;

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  color?: string;
};

// Garamond.<style>(size) → style object, mirroring the Swift helpers.
export const garamond = {
  regular: (size: number): TextStyle => ({ fontFamily: fonts.regular, fontSize: size }),
  medium: (size: number): TextStyle => ({ fontFamily: fonts.medium, fontSize: size }),
  italic: (size: number): TextStyle => ({ fontFamily: fonts.italic, fontSize: size }),
  mediumItalic: (size: number): TextStyle => ({ fontFamily: fonts.mediumItalic, fontSize: size }),
};

// Mono.label(size, tracking) — system monospaced for structural labels.
// `tracking` (points in SwiftUI) maps to letterSpacing here.
export const mono = (size = 10, tracking = 2.4) => ({
  fontFamily: "Courier" as const,
  fontWeight: "500" as const,
  fontSize: size,
  letterSpacing: tracking,
});

// --- Night: the thread-and-belt redesign (v3) ---
// Near-black warm ground, one hot orange, Bricolage Grotesque for type and
// Menlo for small structural labels.

export const night = {
  bg: "#0e0d0c",
  panel: "#1a1714",
  dock: "#151210",
  well: "#0e0d0c",
  ghost: "#2a2522",
  ink: "#f2eee6",
  soft: "#c9c0b4",
  dim: "#8c847a",
  faint: "#6b645c",
  hot: "#ff6a2b",
  hotText: "#ff8a55",
  hotLine: "rgba(255,106,43,0.45)",
  hotWash: "rgba(255,106,43,0.08)",
  rest: "#5a3a2a",
  danger: "#ff6a5a",
} as const;

// Font family names as registered in app/_layout.tsx.
export const bricolage = {
  regular: "Bricolage-Regular",
  bold: "Bricolage-Bold",
  extraBold: "Bricolage-ExtraBold",
} as const;

export const brico = (size: number, weight: keyof typeof bricolage = "regular") => ({
  fontFamily: bricolage[weight],
  fontSize: size,
});

export const label = (size = 11, tracking = 1) => ({
  fontFamily: "Menlo" as const,
  fontSize: size,
  letterSpacing: tracking,
  color: night.faint,
});
