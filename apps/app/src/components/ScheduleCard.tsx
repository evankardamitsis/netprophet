import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SCHEDULE_RATIO, SHARE_GRID, type ShareView } from '../lib/scheduleShare';
import { colors, fonts } from '../theme';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOCKUP = require('../../assets/logo-on-ink.svg');
/** the lockup's viewBox is 426.43 × 80 */
const LOCKUP_RATIO = 426.43 / 80;

interface Props {
  width: number;
  /** the tournament */
  name: string;
  /** «Σάββατο 25/10» */
  day: string;
  venue: string | null;
  view: ShareView;
  /** «+3 ακόμα» when the day is longer than the picture */
  moreLabel: string | null;
  /** «Πρόγραμμα αγώνων», above the list */
  listTitle: string;
}

/**
 * The day's schedule as a picture for the Viber and WhatsApp groups: ink, the tournament, the day and the venue, then one
 * line per match (time, where, who against whom, category) and the NetProphet lockup with the site. Nothing is lime:
 * nothing here is earned. The screen captures this view as a 1080 px wide PNG.
 */
export const ScheduleCard = forwardRef<View, Props>(function ScheduleCard({ width, name, day, venue, view, moreLabel, listTitle }, ref) {
  const height = Math.round(width * SCHEDULE_RATIO);
  const k = width / 360;
  const logoH = 18 * k;
  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height, borderRadius: 28 * k, padding: SHARE_GRID.pad * k }]}>
      <View style={{ gap: 3 * k }}>
        <Text style={[styles.title, { fontSize: 22 * k, lineHeight: 27 * k }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.day, { fontSize: 15 * k, lineHeight: 20 * k }]} numberOfLines={1}>
          {venue ? `${day} · ${venue}` : day}
        </Text>
      </View>
      <Text style={[styles.kicker, { marginTop: 14 * k, marginBottom: 8 * k, fontSize: 13 * k, lineHeight: 20 * k }]}>{listTitle}</Text>
      <View style={{ gap: 9 * k }}>
        {view.rows.map((r) => (
          <View key={r.id} style={[styles.row, { gap: 10 * k, paddingBottom: 8 * k }]}>
            <Text style={[styles.time, { width: 48 * k, fontSize: 15 * k, lineHeight: 19 * k }]} numberOfLines={1}>
              {r.time}
            </Text>
            <View style={styles.body}>
              {r.double ? (
                <>
                  <Text style={[styles.names, { fontSize: 14 * k, lineHeight: 18 * k }]}>{r.a}</Text>
                  <Text style={[styles.names, { fontSize: 14 * k, lineHeight: 18 * k }]}>
                    <Text style={styles.vs}>vs</Text> {r.b}
                  </Text>
                </>
              ) : (
                <Text style={[styles.names, { fontSize: 14 * k, lineHeight: 18 * k }]}>
                  {r.a} <Text style={styles.vs}>vs</Text> {r.b}
                </Text>
              )}
              {r.place || r.meta ? (
                <Text style={[styles.meta, { fontSize: 11 * k, lineHeight: 15 * k }]}>{[r.place, r.meta].filter(Boolean).join(' · ')}</Text>
              ) : null}
            </View>
          </View>
        ))}
        {moreLabel ? <Text style={[styles.more, { fontSize: 13 * k, lineHeight: 17 * k, marginTop: -3 * k }]}>{moreLabel}</Text> : null}
      </View>
      <View style={styles.spacer} />
      <View style={[styles.foot, { gap: 4 * k, paddingTop: 16 * k }]}>
        <Image source={LOCKUP} style={{ width: logoH * LOCKUP_RATIO, height: logoH }} contentFit="contain" />
        <Text style={[styles.site, { fontSize: 12 * k, lineHeight: 16 * k }]}>netprophetapp.com</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: colors.ink },
  title: { fontFamily: fonts.bodyBold, color: colors.paper },
  day: { fontFamily: fonts.bodyBold, color: colors.mist },
  kicker: { fontFamily: fonts.bodyBold, color: colors.paper },
  spacer: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.inkLine },
  time: { fontFamily: fonts.bodyBold, color: colors.paper },
  body: { flex: 1 },
  names: { fontFamily: fonts.bodyBold, color: colors.paper },
  vs: { fontFamily: fonts.body, color: colors.mist },
  meta: { fontFamily: fonts.body, color: colors.mist },
  more: { fontFamily: fonts.bodyBold, color: colors.mist },
  foot: { alignItems: 'flex-start' },
  site: { fontFamily: fonts.bodyBold, color: colors.mist },
});
