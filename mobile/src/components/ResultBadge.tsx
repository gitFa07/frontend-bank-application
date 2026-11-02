import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { BRAND_ACCENTS } from '@/constants/theme';
import { useTheme } from '@/context/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export type BadgeTone = 'success' | 'pending' | 'error' | 'neutral';

const GLYPHS: Record<BadgeTone, string> = {
  success: 'M34 52 L46 64 L68 40',
  pending: 'M50 32 L50 52 L62 60',
  error: 'M38 38 L62 62 M62 38 L38 62',
  neutral: 'M50 46 L50 66 M50 34 L50 35',
};
// Longer than every glyph path, so one dash hides/reveals the whole stroke.
const DASH = 70;

function BurstDot({ index, burst }: { index: number; burst: SharedValue<number> }) {
  const angle = (index / 12) * Math.PI * 2;
  const props = useAnimatedProps(() => ({
    cx: 50 + Math.cos(angle) * 78 * burst.value,
    cy: 50 + Math.sin(angle) * 78 * burst.value,
    opacity: burst.value === 0 ? 0 : 1 - burst.value,
  }));
  return <AnimatedCircle r={3.5} fill={BRAND_ACCENTS[index % 4]} animatedProps={props} />;
}

/** Animated status circle for the payment result and receipt screens (port of the web GSAP version). */
export default function ResultBadge({ tone = 'success', size = 120, animate = true }: { tone?: BadgeTone; size?: number; animate?: boolean }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const still = !animate || reduced;
  const fill = { success: colors.primary, pending: colors.warn, error: colors.danger, neutral: colors.subtle }[tone];

  const disc = useSharedValue(still ? 1 : 0);
  const draw = useSharedValue(still ? 1 : 0);
  const ring = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    disc.set(withTiming(1, { duration: 550, easing: Easing.out(Easing.back(1.8)) }));
    draw.set(withDelay(400, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })));
    ring.set(withDelay(500, withRepeat(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }), 2, false)));
    if (tone === 'success') burst.set(withDelay(500, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })));
  }, [still, tone, disc, draw, ring, burst]);

  const discProps = useAnimatedProps(() => ({ r: 40 * disc.value }));
  const glyphProps = useAnimatedProps(() => ({ strokeDashoffset: DASH * (1 - draw.value) }));
  const ringProps = useAnimatedProps(() => ({ r: 40 + 36 * ring.value, opacity: ring.value === 0 ? 0 : 0.45 * (1 - ring.value) }));

  return (
    <Svg width={size * 1.6} height={size * 1.6} viewBox="-30 -30 160 160" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AnimatedCircle cx={50} cy={50} fill={fill} animatedProps={ringProps} />
      {tone === 'success' ? Array.from({ length: 12 }, (_, i) => <BurstDot key={i} index={i} burst={burst} />) : null}
      <AnimatedCircle cx={50} cy={50} fill={fill} animatedProps={discProps} />
      <AnimatedPath
        d={GLYPHS[tone]}
        fill="none"
        stroke={colors.bg}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={DASH}
        animatedProps={glyphProps}
      />
    </Svg>
  );
}
