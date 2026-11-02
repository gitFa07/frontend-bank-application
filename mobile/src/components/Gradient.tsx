import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/context/theme';

/** The kit's sky-blue banner gradient, drawn behind a section. */
export default function BannerGradient() {
  const { colors } = useTheme();
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id="banner" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.bannerFrom} />
          <Stop offset="1" stopColor={colors.bannerTo} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#banner)" />
    </Svg>
  );
}
