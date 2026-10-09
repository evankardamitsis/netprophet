/**
 * A crowd split is only worth showing once there is a crowd.
 *
 * Generated cards start at all zeros — the split fills from the run's own
 * answers, and there are none on the day a card is first served. Rendering
 * "0%" beside every option reads as a broken feature; rendering an invented
 * number costs the game's credibility the first time someone checks it. So
 * below the threshold the reveal simply says nothing (content spec §4.1).
 */
export const CROWD_THRESHOLD = 20;

export function hasCrowd(split: number[] | undefined): split is number[] {
    if (!split) return false;
    return split.reduce((n, share) => n + share, 0) >= CROWD_THRESHOLD;
}
