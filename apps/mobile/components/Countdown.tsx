import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

function parts(ms: number): { value: string; caption: string } {
  if (ms <= 0) return { value: '0:00', caption: '' };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return { value: `${d}d ${h}h`, caption: '' };
  if (h > 0) return { value: `${h}:${String(m).padStart(2, '0')}`, caption: 'hrs' };
  return { value: `${m}:${String(s).padStart(2, '0')}`, caption: 'min' };
}

interface CountdownProps {
  until: string;
  label?: string;
  tone?: 'rose' | 'amber' | 'paper';
  size?: number;
  onDone?: () => void;
}

export function Countdown({ until, label, tone = 'rose', size = 44, onDone }: CountdownProps) {
  const [now, setNow] = useState(Date.now());
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = new Date(until).getTime() - now;
  const done = remaining <= 0;

  useEffect(() => {
    if (done) onDoneRef.current?.();
  }, [done]);

  const color = tone === 'amber' ? colors.amber : tone === 'paper' ? colors.ink : colors.rose;
  const { value, caption } = parts(remaining);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text
          style={{
            color,
            fontSize: size,
            fontFamily: fonts.serif,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
        {!!caption && (
          <Text style={{ color, fontSize: size * 0.35, fontFamily: fonts.sansMedium }}>
            {caption}
          </Text>
        )}
      </View>
      {!!label && (
        <Text
          style={{
            color: tone === 'paper' ? colors.inkSoft : colors.muted,
            fontSize: 11,
            fontFamily: fonts.sansBold,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
