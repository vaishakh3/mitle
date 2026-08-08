import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Screen } from '../components/ui';
import { getMyProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

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
        <ActivityIndicator color={colors.accent} size="large" />
      </Screen>
    );
  }

  if (!session) return <Redirect href="/sign-in" />;
  if (!profileQuery.data?.onboarding_complete) return <Redirect href="/onboarding" />;
  return <Redirect href="/today" />;
}
