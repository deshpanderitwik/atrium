// Ported from Atrium/Sources/Models/HouseCatalog.swift.
// The order matters — it moves from self outward to world.

export type House = {
  id: string;
  name: string;
  definition: string;
};

export const HOUSES: House[] = [
  {
    id: "corpus",
    name: "Corpus",
    definition:
      "The breath is right, the posture is right, the gait is right. Movement without friction.",
  },
  {
    id: "animus",
    name: "Animus",
    definition:
      "The wound is met cleanly; the day's emotion integrates in sleep; you wake whole.",
  },
  {
    id: "tempus",
    name: "Tempus",
    definition:
      "The day has rhythm; rest and work alternate in proportion; the week breathes.",
  },
  {
    id: "domus",
    name: "Domus",
    definition:
      "The apartment exhales. Every object is where it wants to be. Light falls correctly on the surfaces.",
  },
  {
    id: "patrimonium",
    name: "Patrimonium",
    definition:
      "Enough. Resources flow without anxiety; nothing in the life is starving for lack.",
  },
  {
    id: "opus",
    name: "Opus",
    definition:
      "The problem suddenly has shape; the next move is obvious; forward motion in the chest.",
  },
  {
    id: "ars",
    name: "Ars",
    definition:
      "The right notes. The phrase that lands. The image that works. The made thing is more than the parts that went into it.",
  },
  {
    id: "studium",
    name: "Studium",
    definition:
      "The concept clicks. You can re-derive it from first principles. It stays.",
  },
  {
    id: "vinculum",
    name: "Vinculum",
    definition:
      "A conversation in which the other person feels met, you feel met, and something emerges between you that wasn't there alone.",
  },
  {
    id: "polis",
    name: "Polis",
    definition: "Contribution to the larger fabric without exhausting the self.",
  },
  {
    id: "naturum",
    name: "Naturum",
    definition:
      "Time outdoors that re-regulates the body. The awe of altitude, the smell of pine, the indifferent ocean.",
  },
  {
    id: "ludus",
    name: "Ludus",
    definition: "Laughter that surprises you. Play that returns you to lightness.",
  },
];

export const houseById = (id: string): House | undefined =>
  HOUSES.find((h) => h.id === id);
