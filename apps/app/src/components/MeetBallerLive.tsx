import { useAuth } from '../lib/auth';
import { useBaller, useLook, useMyAvatar } from '../lib/data';
import { MeetBaller } from './MeetBaller';

/** «Γνώρισε τον Baller σου» with your own style, kit, gear and name, saving to your account */
export function MeetBallerLive({ onDone, onLater, laterLabel }: { onDone: () => void; onLater?: () => void; laterLabel?: string }) {
  const { session } = useAuth();
  const my = useMyAvatar();
  const look = useLook();
  const baller = useBaller();
  // wait for the style and the name, so the screen opens on yours
  if (!my.avatar || baller.met === null) return null;
  const eq = look.look?.equipped;
  return (
    <MeetBaller
      userId={session?.user.id ?? 'guest'}
      lang="el"
      current={my.avatar}
      name={baller.name}
      kit={eq?.kit ?? 'kit_green'}
      gear={eq?.gear ?? null}
      frame={eq?.frame ?? null}
      pickAvatar={(key) => my.pick(key)}
      saveName={baller.save}
      onDone={onDone}
      onLater={onLater}
      laterLabel={laterLabel}
    />
  );
}
