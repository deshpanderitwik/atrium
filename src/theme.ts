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
