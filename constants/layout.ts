import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Adjust this value to sit perfectly above your tab bar
export const FLOATING_BUTTON_BOTTOM = 40; 

export default {
  window: {
    width,
    height,
  },
};