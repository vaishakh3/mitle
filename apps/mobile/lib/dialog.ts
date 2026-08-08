// Cross-platform dialogs. react-native-web does NOT implement Alert, so
// confirmations silently no-op in browsers without this wrapper.
import { Alert, Platform } from 'react-native';

export function alert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function confirm(
  title: string,
  message: string,
  confirmLabel = 'OK',
  destructive = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function prompt(title: string, message: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.prompt(`${title}\n\n${message}`) || null);
  }
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Send', onPress: (text?: string) => resolve(text?.trim() || null) },
      ]);
    } else {
      // Android has no native prompt; degrade to a confirm with a fixed note
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Send', onPress: () => resolve('') },
      ]);
    }
  });
}
