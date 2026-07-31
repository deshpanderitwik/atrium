import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, garamond } from "@/theme";
import { haptics } from "@/lib/haptics";
import { STAR_LIMIT } from "@/lib/starLimit";
import { useTodos } from "@/db/store";
import { starredOpen } from "@/db/selectors";
import { HOUSES } from "@/houses";
import { TodoCheckbox } from "./TodoCheckbox";

// The declared tasks, sitting under the orb on Arrive.
//
// Everything on this strip is something you chose to put here — never
// something the app counted. That distinction is what keeps Arrive from
// becoming a dashboard. Tap the circle to complete it, the star to release it
// back to the list, the text to go work on it.
export function DeclaredStrip({ dimmed = false }: { dimmed?: boolean }) {
  const router = useRouter();
  const { todos, toggleDone, toggleStar } = useTodos();

  // Defensive slice — starring is capped at three, but a task that was
  // resting when the third was declared could briefly make four due at once.
  const declared = starredOpen(todos).slice(0, STAR_LIMIT);
  if (declared.length === 0) return null;

  return (
    <View style={{ width: "100%", opacity: dimmed ? 0.25 : 1, marginBottom: 24 }}>
      {declared.map((todo) => {
        const house = HOUSES.find((h) => h.id === todo.houseID);
        return (
          <View
            key={todo.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 9,
              borderBottomWidth: 1,
              borderBottomColor: colors.rule,
            }}
          >
            <TodoCheckbox
              done={false}
              onPress={() => {
                haptics.success();
                toggleDone(todo.id);
              }}
            />

            <Pressable
              style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
              onPress={() => router.push(`/focus/${todo.id}`)}
            >
              <Text
                numberOfLines={1}
                style={{ ...garamond.regular(18), color: colors.ink, flex: 1 }}
              >
                {todo.text}
              </Text>
              <Text
                style={{ ...garamond.italic(15), color: colors.inkFaint, marginLeft: 10 }}
              >
                {house?.name.toLowerCase() ?? ""}
              </Text>
            </Pressable>

            <Pressable
              hitSlop={12}
              onPress={() => {
                haptics.rigid();
                toggleStar(todo.id);
              }}
              style={{ width: 32, height: 25, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 14, color: colors.oxblood }}>★</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
