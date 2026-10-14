import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { BouncingLogo } from './BouncingLogo';

/**
 * The loading screen (founder, 14 Oct: "the loading screen should get the animated logo"): ink, with the logo whose
 * ball hops over the net, while the fonts, the session and onboarding load. The native splash before it is plain ink,
 * so the two read as one.
 */
const LOGO_H = 44;

export function Loading({ logo = true }: { logo?: boolean }) {
  return <View style={styles.screen}>{logo ? <BouncingLogo height={LOGO_H} /> : null}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
