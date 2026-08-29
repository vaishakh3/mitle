// The committed plan as a clear, physical-feeling object. The graphic language
// uses Milte's meeting-point geometry without borrowing ticketing theatrics.
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

const NOTCH = 22;

function Perforation() {
  return (
    <View style={styles.perfRow}>
      <View style={[styles.notch, { left: -NOTCH / 2 - 20 }]} />
      <View style={styles.perfLine} />
      <View style={[styles.notch, { right: -NOTCH / 2 - 20 }]} />
    </View>
  );
}

interface TicketProps {
  venueName: string;
  venueAddress: string;
  dateLabel: string;
  timeLabel: string;
  footer?: React.ReactNode;
}

export function Ticket({ venueName, venueAddress, dateLabel, timeLabel, footer }: TicketProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  return (
    <View style={styles.ticket}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.registration}>
        <View style={{ backgroundColor: colors.rose, flex: 1 }} />
        <View style={{ backgroundColor: colors.marigold, flex: 1 }} />
        <View style={{ backgroundColor: colors.blue, flex: 1 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.topline, isCompact && styles.toplineCompact]}>
          <Text style={styles.micro}>milte<Text style={{ color: colors.rose }}>?</Text></Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={[styles.micro, isCompact && styles.microCompact]}>ONE PERSON · ONE PLACE · ONE HOUR</Text>
        </View>

        <View style={styles.venuePanel}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.routeGlyph}>
            <View style={styles.routeRed} />
            <View style={styles.routeDot} />
            <View style={styles.routePaper} />
          </View>
          <Text style={styles.placeLabel}>THE PLACE</Text>
          <Text style={styles.venue}>{venueName}</Text>
          {!!venueAddress && <Text style={styles.address}>{venueAddress}</Text>}
        </View>

        <Perforation />

        <View style={styles.row}>
          <View style={{ flex: 0.86 }}>
            <Text style={styles.fieldLabel}>DATE</Text>
            <Text style={styles.fieldValue}>{dateLabel}</Text>
          </View>
          <View style={{ flex: 1.14 }}>
            <Text style={styles.fieldLabel}>WINDOW</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.fieldValue}>{timeLabel}</Text>
          </View>
        </View>

        {footer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: colors.paper,
    borderColor: colors.paperShade,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 356,
    position: 'relative',
  },
  registration: { flexDirection: 'row', height: 7, left: 0, position: 'absolute', right: 0, top: 0 },
  content: { paddingBottom: 26, paddingHorizontal: 20, paddingTop: 28 },
  admit: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 14,
  },
  topline: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  toplineCompact: { flexDirection: 'column', gap: 5, justifyContent: 'center' },
  micro: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.7,
    color: colors.inkSoft,
  },
  microCompact: { fontSize: 8, letterSpacing: 1.25, textAlign: 'center', width: '100%' },
  venuePanel: {
    backgroundColor: colors.blue,
    marginHorizontal: -20,
    paddingBottom: 26,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  routeGlyph: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  routeRed: { backgroundColor: colors.rose, flex: 1, height: 3 },
  routeDot: { backgroundColor: colors.marigold, borderRadius: 8, height: 16, marginHorizontal: 8, width: 16 },
  routePaper: { backgroundColor: colors.paper, flex: 1, height: 3 },
  placeLabel: {
    color: colors.marigold,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2.4,
    marginBottom: 7,
    textAlign: 'center',
  },
  venue: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    lineHeight: 36,
    color: colors.onAccent,
    textAlign: 'center',
  },
  address: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: '#E8ECFF',
    textAlign: 'center',
    marginTop: 6,
  },
  perfRow: {
    height: NOTCH,
    justifyContent: 'center',
    marginVertical: 18,
    marginHorizontal: -20,
    overflow: 'visible',
  },
  perfLine: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.paperShade,
    marginHorizontal: 26,
  },
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: colors.bgDeep,
    top: 0,
  },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 2, paddingVertical: 4 },
  fieldLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.inkSoft,
    marginBottom: 3,
  },
  fieldValue: { fontFamily: fonts.serif, fontSize: 17, color: colors.ink },
});
