import type { RefObject } from 'react';
import { PixelRatio, Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { CARD_RATIO } from '../components/BallerCard';

/** the picture that goes out: 1080 × 1350 pixels (view-shot sizes in points) */
const OUT_W = 1080;

/**
 * Sends a 4:5 card as a picture through the phone's share sheet (as «Μοιράσου τον Baller σου» does). On the web,
 * where a picture cannot go, the words and the link go instead. Says how it went out; throws when it did not.
 */
export async function shareCard(card: RefObject<View | null>, message: string, title: string, ratio: number = CARD_RATIO): Promise<'image' | 'text'> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.share) await navigator.share({ text: message });
    else await navigator.clipboard.writeText(message);
    return 'text';
  }
  if (card.current && (await Sharing.isAvailableAsync())) {
    const px = PixelRatio.get();
    const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile', width: OUT_W / px, height: (OUT_W * ratio) / px });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
    return 'image';
  }
  await Share.share({ message });
  return 'text';
}
