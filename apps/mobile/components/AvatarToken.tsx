import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { avatarById } from '../lib/avatars';
import { colors, fonts } from '../lib/theme';
import type { AvatarId } from '../lib/types';

interface AvatarTokenProps {
  id: AvatarId;
  size?: number;
  label?: boolean;
  selected?: boolean;
  onPress?: () => void;
}

export function AvatarToken({ id, size = 44, label = false, selected = false, onPress }: AvatarTokenProps) {
  const avatar = avatarById(id);
  // The source art includes a small transparent safety margin. Crop that margin
  // inside the token so every bust meets the lower edge instead of floating.
  const artworkSize = size * 1.09;
  const artworkBottom = size * -0.055;
  const visual = (
    <>
      <View
        style={{ height: size, position: 'relative', width: size }}
      >
        <View
          style={[
            styles.art,
            {
              backgroundColor: avatar.wash,
              borderColor: selected ? colors.blue : colors.borderSoft,
              borderRadius: size / 2,
              height: size,
              width: size,
            },
          ]}
        >
          <Image
            accessibilityIgnoresInvertColors
            source={avatar.source}
            resizeMode="contain"
            style={{ bottom: artworkBottom, height: artworkSize, position: 'absolute', width: artworkSize }}
          />
        </View>
        {selected && <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.tick}><Text style={styles.tickText}>✓</Text></View>}
      </View>
      {label && <Text numberOfLines={1} style={[styles.label, selected && styles.selectedLabel]}>{avatar.label}</Text>}
    </>
  );

  if (!onPress) return <View accessibilityLabel={`${avatar.label} token`} style={[styles.wrapper, { minWidth: size }]}>{visual}</View>;

  return (
    <Pressable
      accessibilityLabel={`${avatar.label} token`}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.wrapper, { minWidth: size }]}
    >
      {visual}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 7 },
  art: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  tick: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: -3,
    top: -3,
    width: 20,
  },
  tickText: { color: colors.onAccent, fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 13 },
  label: { color: colors.textDim, fontFamily: fonts.sansMedium, fontSize: 12 },
  selectedLabel: { color: colors.blueDeep, fontFamily: fonts.sansBold },
});
