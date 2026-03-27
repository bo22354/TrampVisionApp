import { TouchableOpacity, TouchableOpacityProps, StyleSheet, Text, ActivityIndicator } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

type PrimaryButtonProps = TouchableOpacityProps & {
  title: string;
  isLoading?: boolean;
};

export function PrimaryButton({ title, onPress, disabled, isLoading, ...rest }: PrimaryButtonProps) {
  const backgroundColor = useThemeColor({}, 'tertiary');
  const disabledColor = useThemeColor({}, 'trackBackground');

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      style={[
        styles.button,
        { backgroundColor: disabled || isLoading ? disabledColor : backgroundColor },
      ]}
      activeOpacity={0.8}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
});