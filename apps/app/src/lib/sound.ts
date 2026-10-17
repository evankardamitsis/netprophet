import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

/**
 * Baller's sounds (founder, 17 Oct: "we can have sound"): a pop on a landing, a little cheer on a right call, a soft
 * «ωχ» on a miss, a squeak on a poke. On by default and quiet; silent with the ringer off, mixed with whatever else is
 * playing (never stops your music); one switch, «Ήχοι», in Ρυθμίσεις. Short synthesised clips in assets/sounds.
 */
export type SoundName = 'pop' | 'cheer' | 'aw' | 'squeak' | 'boom' | 'bounce' | 'fanfare' | 'whoosh' | 'applause';

const SOURCES: Record<SoundName, number> = {
  /* eslint-disable @typescript-eslint/no-require-imports */
  pop: require('../../assets/sounds/pop.wav'),
  cheer: require('../../assets/sounds/cheer.wav'),
  aw: require('../../assets/sounds/aw.wav'),
  squeak: require('../../assets/sounds/squeak.wav'),
  boom: require('../../assets/sounds/boom.wav'),
  bounce: require('../../assets/sounds/bounce.wav'),
  fanfare: require('../../assets/sounds/fanfare.wav'),
  whoosh: require('../../assets/sounds/whoosh.wav'),
  applause: require('../../assets/sounds/applause.wav'),
  /* eslint-enable @typescript-eslint/no-require-imports */
};
const VOLUME = 0.6;
export const SOUNDS_KEY = 'np_sounds';

let enabled = true;
let ready = false;
const players: Partial<Record<SoundName, AudioPlayer>> = {};
const listeners = new Set<(on: boolean) => void>();

/** read the switch once at start and set the audio session to play along, never over, other audio */
export async function initSounds(): Promise<void> {
  if (ready || Platform.OS === 'web') return;
  ready = true;
  enabled = (await AsyncStorage.getItem(SOUNDS_KEY).catch(() => null)) !== '0';
  await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
}

export function playSound(name: SoundName): void {
  if (!enabled || Platform.OS === 'web') return;
  try {
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      p.volume = VOLUME;
      players[name] = p;
    }
    void p.seekTo(0);
    p.play();
  } catch {
    // a sound is never worth an error
  }
}

export function setSoundsOn(on: boolean): void {
  enabled = on;
  AsyncStorage.setItem(SOUNDS_KEY, on ? '1' : '0').catch(() => undefined);
  listeners.forEach((l) => l(on));
}

/** «Ήχοι» in Ρυθμίσεις */
export function useSoundsOn(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(enabled);
  useEffect(() => {
    void initSounds().then(() => setOn(enabled));
    listeners.add(setOn);
    return () => {
      listeners.delete(setOn);
    };
  }, []);
  return [on, setSoundsOn];
}
