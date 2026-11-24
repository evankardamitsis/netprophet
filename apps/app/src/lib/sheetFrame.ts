import { useMemo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from '@netprophet/tokens';
import { useLayout } from './layout';

/** on a tablet a dialog rises this far as it fades in, instead of a sheet's full height */
const DIALOG_TRAVEL = 40;

/**
 * Where a sheet sits (tablet board 24 Nov, all A): on a phone it rises from the bottom over the home indicator; from
 * `tablet` it is a centred dialog, rounded all round, over the dimmed screen, and a tap outside it still closes it.
 */
export function useSheetFrame() {
  const { dialogs } = useLayout();
  const insets = useSafeAreaInsets();
  return useMemo(
    () => ({
      dialog: dialogs,
      back: dialogs ? styles.back : null,
      /** the tap-to-close layer: above the sheet on a phone, all around the dialog on a tablet */
      fill: dialogs ? StyleSheet.absoluteFill : null,
      sheet: dialogs ? styles.dialog : null,
      /** a sheet's bottom padding: on a phone it also clears the home indicator */
      bottom: (base: number) => base + (dialogs ? 0 : insets.bottom),
      /** how far it travels in: a sheet its own height, a dialog a little */
      travel: (sheet: number) => (dialogs ? DIALOG_TRAVEL : sheet),
    }),
    [dialogs, insets.bottom],
  );
}

const styles = StyleSheet.create({
  back: { justifyContent: 'center', alignItems: 'center', padding: 24 } satisfies ViewStyle,
  dialog: { borderRadius: 28, width: '100%', maxWidth: layout.sheet } satisfies ViewStyle,
});
