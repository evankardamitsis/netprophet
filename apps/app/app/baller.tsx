import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeetBallerLive } from '../src/components/MeetBallerLive';
import { BALLER_OFFERED_KEY } from '../src/lib/ballerOffer';
import { useCopy } from '../src/i18n';

/**
 * «Γνώρισε τον Baller σου», full screen: from the profile, and once for players who were here before Baller had a name
 * (`?first=1`, which offers «Αργότερα»).
 */
export default function BallerScreen() {
  const t = useCopy();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const later = () => {
    AsyncStorage.setItem(BALLER_OFFERED_KEY, '1').catch(() => undefined);
    close();
  };
  // the first time it is «Αργότερα»; from the profile, «‹ Πίσω» leaves it as it was
  return first ? <MeetBallerLive onDone={close} onLater={later} /> : <MeetBallerLive onDone={close} onLater={close} laterLabel={t.onboarding.back} />;
}
