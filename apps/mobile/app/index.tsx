import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { MiltePulse } from '../components/MiltePulse';
import { Body, Button, Card, Page, Screen, Title } from '../components/ui';
import { spacing } from '../lib/theme';
import { hasCurrentConsent } from '../lib/legal';
import { getMyProfile } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Index() {
  const { session, loading } = useAuth();
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: getMyProfile,
    enabled: !!session,
  });

  if (loading || (session && profileQuery.isLoading)) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <View accessible accessibilityLabel="Loading Milte" accessibilityLiveRegion="polite" style={{ alignItems: 'center' }}>
          <MiltePulse size={80} />
        </View>
      </Screen>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;
  if (profileQuery.isError) {
    return (
      <Screen style={{ justifyContent: 'center' }}>
        <Page>
          <Card accessibilityRole="alert" style={{ gap: spacing.md }}>
            <Title>Your place is still here.</Title>
            <Body>{profileQuery.error instanceof Error ? profileQuery.error.message : 'Milte could not load your account.'}</Body>
            <Button title="Try again" onPress={() => profileQuery.refetch()} loading={profileQuery.isFetching} />
          </Card>
        </Page>
      </Screen>
    );
  }
  if (profileQuery.data?.is_suspended) return <Redirect href="/account-review" />;
  if (!profileQuery.data?.onboarding_complete) return <Redirect href="/onboarding" />;
  if (!hasCurrentConsent(profileQuery.data)) return <Redirect href="/consent" />;
  return <Redirect href="/today" />;
}
