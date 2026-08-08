// The committed match as a physical object: a cream paper ticket stub,
// perforated, "ADMIT TWO STRANGERS". The one moment the app leaves the night.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  return (
    <View style={styles.ticket}>
      <Text style={styles.admit}>ADMIT TWO STRANGERS</Text>
      <Text style={styles.venue}>{venueName}</Text>
      {!!venueAddress && <Text style={styles.address}>{venueAddress}</Text>}

      <Perforation />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>DATE</Text>
          <Text style={styles.fieldValue}>{dateLabel}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>WINDOW</Text>
          <Text style={styles.fieldValue}>{timeLabel}</Text>
        </View>
      </View>

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    paddingVertical: 26,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  admit: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 14,
  },
  venue: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    lineHeight: 36,
    color: colors.ink,
    textAlign: 'center',
  },
  address: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkSoft,
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
  row: { flexDirection: 'row', gap: 12 },
  fieldLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.inkSoft,
    marginBottom: 3,
  },
  fieldValue: { fontFamily: fonts.serif, fontSize: 17, color: colors.ink },
});
