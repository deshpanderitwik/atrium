import Foundation

// The twelve houses, in their fixed order — self outward to world.
// Definitions are verbatim from the brief; they are the house's identity,
// not flavor text. Order is structural and must be preserved.

enum HouseCatalog {
    static let houses: [House] = [
        House(id: "corpus",      name: "Corpus",
              definition: "The breath is right, the posture is right, the gait is right. Movement without friction."),
        House(id: "animus",      name: "Animus",
              definition: "The wound is met cleanly; the day's emotion integrates in sleep; you wake whole."),
        House(id: "tempus",      name: "Tempus",
              definition: "The day has rhythm; rest and work alternate in proportion; the week breathes."),
        House(id: "domus",       name: "Domus",
              definition: "The apartment exhales. Every object is where it wants to be. Light falls correctly on the surfaces."),
        House(id: "patrimonium", name: "Patrimonium",
              definition: "Enough. Resources flow without anxiety; nothing in the life is starving for lack."),
        House(id: "opus",        name: "Opus",
              definition: "The problem suddenly has shape; the next move is obvious; forward motion in the chest."),
        House(id: "ars",         name: "Ars",
              definition: "The right notes. The phrase that lands. The image that works. The made thing is more than the parts that went into it."),
        House(id: "studium",     name: "Studium",
              definition: "The concept clicks. You can re-derive it from first principles. It stays."),
        House(id: "vinculum",    name: "Vinculum",
              definition: "A conversation in which the other person feels met, you feel met, and something emerges between you that wasn't there alone."),
        House(id: "polis",       name: "Polis",
              definition: "Contribution to the larger fabric without exhausting the self."),
        House(id: "naturum",     name: "Naturum",
              definition: "Time outdoors that re-regulates the body. The awe of altitude, the smell of pine, the indifferent ocean."),
        House(id: "ludus",       name: "Ludus",
              definition: "Laughter that surprises you. Play that returns you to lightness."),
    ]
}
