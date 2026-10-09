import { getCopy, type Locale } from '@netprophet/copy';

// TODO(M1): pick the locale from the device / profile. Greek is primary.
const locale: Locale = 'el';

export const copy = getCopy(locale);
export function useCopy() {
  return copy;
}
