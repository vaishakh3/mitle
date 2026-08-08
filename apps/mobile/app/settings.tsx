import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import {
  Body,
  Button,
  Card,
  Chip,
  ChipRow,
  Divider,
  Input,
  Label,
  Screen,
  Small,
  Title,
} from '../components/ui';
import {
  deleteAccount,
  getMyInterestIds,
  getMyPreferences,
  getMyProfile,
  listInterests,
  setMyInterests,
  upsertPreferences,
  upsertProfile,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing } from '../lib/theme';
import type { Gender } from '../lib/types';

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: 'woman', label: 'Women' },
  { value: 'man', label: 'Men' },
  { value: 'nonbinary', label: 'Non-binary' },
];
const RADII_KM = [5, 10, 25, 50];
const MAX_INTERESTS = 5;

export default function Settings() {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ['profile'], queryFn: getMyProfile });
  const prefsQ = useQuery({ queryKey: ['preferences'], queryFn: getMyPreferences });
  const interestsQ = useQuery({ queryKey: ['interests'], queryFn: listInterests });
  const myInterestsQ = useQuery({ queryKey: ['myInterests'], queryFn: getMyInterestIds });

  const [hint, setHint] = useState('');
  const [paused, setPaused] = useState(false);
  const [interestedIn, setInterestedIn] = useState<Gender[]>([]);
  const [radius, setRadius] = useState(10);
  const [picked, setPicked] = useState<number[]>([]);

  useEffect(() => {
    if (profileQ.data) {
      setHint(profileQ.data.spot_hint);
      setPaused(profileQ.data.is_paused);
    }
  }, [profileQ.data]);
  useEffect(() => {
    if (prefsQ.data) {
      setInterestedIn(prefsQ.data.interested_genders);
      setRadius(prefsQ.data.radius_km);
    }
  }, [prefsQ.data]);
  useEffect(() => {
    if (myInterestsQ.data) setPicked(myInterestsQ.data);
  }, [myInterestsQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      await upsertProfile({ spot_hint: hint.trim(), is_paused: paused });
      await upsertPreferences({ interested_genders: interestedIn, radius_km: radius });
      await setMyInterests(picked);
    },
    onSuccess: () => {
      qc.invalidateQueries();
      Alert.alert('Saved', 'Changes apply from the next daily match.');
    },
    onError: (err) => Alert.alert('Hmm', err instanceof Error ? err.message : String(err)),
  });

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'Profile, preferences, any active match — gone. No undo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/sign-in');
            } catch (err) {
              Alert.alert('Hmm', err instanceof Error ? err.message : String(err));
            }
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl + spacing.sm,
          paddingBottom: spacing.sm,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontSize: 13, fontFamily: fonts.sansBold, letterSpacing: 2, color: colors.muted }}>
            ← BACK
          </Text>
        </Pressable>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: spacing.xxl }}
      >
        <Title>Settings</Title>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Body style={{ color: colors.text }}>Pause matching</Body>
              <Small>Take a breath. No new matches while paused.</Small>
            </View>
            <Switch
              value={paused}
              onValueChange={setPaused}
              trackColor={{ true: colors.rose, false: colors.border }}
              thumbColor={colors.text}
            />
          </View>
        </Card>

        <Card>
          <Label>Your spot hint</Label>
          <Small>The one line a committed match gets. Make it worth looking for.</Small>
          <View style={{ height: spacing.sm }} />
          <Input
            value={hint}
            onChangeText={setHint}
            multiline
            style={{ minHeight: 70 }}
            placeholder='"Red scarf, probably reading a book"'
          />
        </Card>

        <Card>
          <Label>Interested in</Label>
          <View style={{ height: spacing.sm }} />
          <ChipRow>
            {GENDERS.map((g) => (
              <Chip
                key={g.value}
                label={g.label}
                selected={interestedIn.includes(g.value)}
                onPress={() =>
                  setInterestedIn((prev) =>
                    prev.includes(g.value)
                      ? prev.filter((x) => x !== g.value)
                      : [...prev, g.value],
                  )
                }
              />
            ))}
          </ChipRow>
          <Divider />
          <Label>Within</Label>
          <View style={{ height: spacing.sm }} />
          <ChipRow>
            {RADII_KM.map((r) => (
              <Chip key={r} label={`${r} km`} selected={radius === r} onPress={() => setRadius(r)} />
            ))}
          </ChipRow>
        </Card>

        <Card>
          <Label>Interests</Label>
          <View style={{ height: spacing.sm }} />
          <ChipRow>
            {(interestsQ.data ?? []).map((i) => (
              <Chip
                key={i.id}
                label={`${i.emoji} ${i.label}`}
                selected={picked.includes(i.id)}
                onPress={() =>
                  setPicked((prev) =>
                    prev.includes(i.id)
                      ? prev.filter((x) => x !== i.id)
                      : prev.length < MAX_INTERESTS
                        ? [...prev, i.id]
                        : prev,
                  )
                }
              />
            ))}
          </ChipRow>
        </Card>

        <Button title="Save changes" onPress={() => save.mutate()} loading={save.isPending} />
        <Button
          title="Sign out"
          variant="ghost"
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace('/sign-in');
          }}
        />
        <Button title="Delete account" variant="danger" onPress={confirmDelete} />
      </ScrollView>
    </Screen>
  );
}
