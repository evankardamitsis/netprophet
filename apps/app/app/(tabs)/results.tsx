import { Placeholder } from '../../src/components/Placeholder';
import { useCopy } from '../../src/i18n';

export default function Screen() {
  const t = useCopy();
  return <Placeholder text={t.placeholder.results} withAdd={true} />;
}
