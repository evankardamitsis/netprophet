/** how a purchase ended: bought, the player closed it, no store yet (keys not set, Expo Go), or an error */
export type BuyResult = 'ok' | 'cancelled' | 'unavailable' | 'failed';
