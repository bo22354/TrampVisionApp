import { Text as DefaultText, View as DefaultView, StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'] & {
  type?: 'default' | 'title' | 'subtitle' | 'monospace';
};

export type ViewProps = ThemeProps & DefaultView['props'];

export function ThemedText(props: TextProps) {
  const { style, lightColor, darkColor, type = 'default', ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <DefaultText
      style={[
        { color },
        styles[type],
        style,
      ]}
      {...otherProps}
    />
  );
}

export function ThemedView(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  monospace: {
    fontFamily: 'monospace',
  }
});