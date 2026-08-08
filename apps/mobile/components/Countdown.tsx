import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { colors } from '../lib/theme';

function format(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Countdown({ until, onDone }: { until: string; onDone?: () => void }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = new Date(until).getTime() - now;

  useEffect(() => {
    if (remaining <= 0 && onDone) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0]);

  return (
    <Text style={{ color: colors.accent, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
      {format(remaining)}
    </Text>
  );
}
