import type { ViewStyle } from 'react-native';
import { colors, cosmetics } from '../theme';

/**
 * Frames are rings around the ball people since 15 Oct (components/Avatar.tsx, FrameRing); what stays on the card is
 * how the name dresses under each frame, from the prototype's `.nphero[data-f] .nm`.
 */
/** how the name dresses under a frame (prototype `.nphero[data-f] .nm`): a plate behind the name, in the frame's colours */
export interface NamePlate {
  box: ViewStyle;
  color: string;
}

export function namePlate(frame: string | null): NamePlate | null {
  const f = cosmetics.frame;
  const pad = { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8 } as const;
  switch (frame) {
    case 'frame_week':
      return { box: { ...pad, backgroundColor: colors.lime, borderRadius: 10 }, color: colors.ink };
    case 'frame_ten':
      return { box: { ...pad, backgroundColor: colors.paper, borderRadius: 10, borderWidth: 3, borderColor: colors.lime }, color: colors.ink };
    case 'frame_seven':
      return { box: { ...pad, backgroundColor: colors.ink, borderRadius: 10, borderWidth: 2, borderColor: f.glow }, color: colors.lime };
    case 'frame_month_top':
      return { box: { ...pad, backgroundColor: colors.ink, borderRadius: 4, borderBottomWidth: 5, borderColor: colors.lime }, color: colors.paper };
    case 'frame_friends':
      return { box: { ...pad, backgroundColor: colors.paper, borderRadius: 12, borderWidth: 3, borderColor: colors.lime }, color: colors.ink };
    case 'frame_level':
      return { box: { ...pad, backgroundColor: colors.ink, borderRadius: 999, borderWidth: 2, borderColor: colors.lime }, color: colors.paper };
    case 'frame_gold':
      return { box: { ...pad, backgroundColor: f.goldLight, borderRadius: 10, borderWidth: 2, borderColor: f.goldDeep }, color: f.goldInk };
    case 'frame_retro':
      return { box: { ...pad, backgroundColor: f.retroCream, borderRadius: 0, borderWidth: 3, borderColor: colors.ink }, color: f.retroInk };
    case 'frame_grass':
      return { box: { ...pad, backgroundColor: f.grassPlate, borderRadius: 6, borderWidth: 2, borderColor: colors.paper }, color: colors.paper };
    default:
      return null;
  }
}

