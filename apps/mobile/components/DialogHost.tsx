import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import * as dialog from '../lib/dialog';
import { colors, radii, spacing } from '../lib/theme';
import { Body, Button, Title } from './ui';

export function DialogHost() {
  const [request, setRequest] = useState<dialog.DialogRequest | null>(null);

  useEffect(() => dialog.subscribe(setRequest), []);

  if (!request) return null;

  const close = (accepted: boolean) => dialog.resolve(request.id, accepted);

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => close(false)}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View style={styles.card}>
          <Title accessibilityRole="header">{request.title}</Title>
          {!!request.message && <Body>{request.message}</Body>}
          <View style={styles.actions}>
            {request.canCancel && (
              <View style={styles.action}>
                <Button title="Cancel" variant="secondary" onPress={() => close(false)} />
              </View>
            )}
            <View style={styles.action}>
              <Button
                title={request.confirmLabel}
                variant={request.destructive ? 'danger' : 'primary'}
                onPress={() => close(true)}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(27, 23, 25, 0.46)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    gap: spacing.md,
    maxWidth: 440,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 36,
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
