const tintColorLight = '#007AFF';
const tintColorDark = '#0A84FF';

export default {
  light: {
    text: '#000',
    background: '#f0f0f0',
    tint: tintColorLight,
    primary: tintColorLight,
    secondary: '#FFD60A', // For timeline handles
    tertiary: '#FF6B00', // For primary action buttons
    card: '#fff',
    border: '#e0e0e0',
    trackBackground: '#e5e5e5',
    playButton: '#fff',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    primary: tintColorDark,
    secondary: '#FFD60A', // For timeline handles
    tertiary: '#FF6B00', // For primary action buttons
    card: '#1c1c1e',
    border: '#3a3a3c',
    trackBackground: '#333',
    playButton: '#1c1c1e',
  },
};