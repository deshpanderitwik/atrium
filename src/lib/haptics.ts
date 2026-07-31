// Ported from Atrium/Sources/Utils/Haptics.swift onto expo-haptics.
import * as Haptics from "expo-haptics";

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  soft: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
  rigid: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  selection: () => Haptics.selectionAsync(),
};
