import { describe, expect, it } from 'vitest';
import { colors } from '../apps/mobile/lib/theme';

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Milte identity contrast', () => {
  it.each([
    ['primary text', colors.text, colors.bg],
    ['body text', colors.textDim, colors.bg],
    ['muted text', colors.muted, colors.bg],
    ['input placeholders', colors.faint, colors.surface],
    ['accent text', colors.accentText, colors.bg],
    ['signal red on canvas', colors.rose, colors.bg],
    ['white on signal red', colors.onAccent, colors.rose],
    ['primary button label', colors.onAccent, colors.blue],
    ['danger text', colors.danger, colors.bg],
    ['paper secondary text', colors.inkSoft, colors.paper],
  ])('%s is at least WCAG AA for normal text', (_label, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
