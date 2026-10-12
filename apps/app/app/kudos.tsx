import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nameGender, type NameGender } from '@netprophet/copy';
import { Back } from '../src/components/OnboardingControls';
import { KudosPicker } from '../src/components/KudosPicker';
import { TOAST_MS, Toast } from '../src/components/Toast';
import { useCopy } from '../src/i18n';
import { useKudos } from '../src/lib/data';
import { kudoQuestion, kudoText } from '../src/lib/kudos';
import { colors } from '../src/theme';

/**
 * «Πες κάτι στον Νίκο ›» from Αποτελέσματα (prototype kres): «Πες μια καλή κουβέντα» to one player, then back.
 * Params: match, to (player id), first (first name), gender.
 */
export default function KudosScreen() {
  const t = useCopy();
  const insets = useSafeAreaInsets();
  const { match = '', to = '', first = '', gender } = useLocalSearchParams<{ match: string; to: string; first: string; gender?: string }>();
  const g: NameGender = nameGender(first, gender === 'f' || gender === 'm' ? gender : null);
  const { options, give } = useKudos(match || null, to || undefined);
  const [toast, setToast] = useState<string | null>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/results'));

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(close, TOAST_MS * 0.6);
    return () => clearTimeout(id);
    // closes once after the toast shows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <Back label={`‹ ${t.common.back}`} onPress={close} />
        {options && options.length > 0 ? (
          <KudosPicker
            question={kudoQuestion(t, g, false, true)}
            options={options.map((o) => ({ key: o.key, text: kudoText(o, g) }))}
            onPick={async (key) => setToast((await give(key, 'results')) ? t.kudos.sent : t.kudos.failed)}
            onSkip={close}
          />
        ) : null}
      </ScrollView>
      {toast ? <Toast text={toast} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
});
