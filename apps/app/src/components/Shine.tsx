import { createElement, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Mask, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Prototype `.shine`: a lime, white, lime gradient (100deg, stops 38/50/62%) 260% wide, clipped to the
 * text and swept from background-position 130% to -130% every 2.6s, linear, forever. Used on πόντοι.
 */
const PERIOD_MS = 2600;
const SIZE = 2.6;
const FROM = 1.3;
const ANGLE_DEG = 100;
const KEYFRAMES_ID = 'np-shine-keyframes';

interface Props {
  text: string;
  /** fontFamily, fontSize and lineHeight of the number */
  style: TextStyle;
}

export function Shine(props: Props) {
  return Platform.OS === 'web' ? <ShineWeb {...props} /> : <ShineNative {...props} />;
}

/* web: the prototype's CSS, as is */
function ShineWeb({ text, style }: Props) {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(KEYFRAMES_ID)) return;
    const el = document.createElement('style');
    el.id = KEYFRAMES_ID;
    el.textContent = `@keyframes np-shine{from{background-position:${FROM * 100}% 0}to{background-position:-${FROM * 100}% 0}}`;
    document.head.appendChild(el);
  }, []);
  return createElement(
    'span',
    {
      style: {
        display: 'block',
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: `${style.lineHeight}px`,
        background: `linear-gradient(${ANGLE_DEG}deg, ${colors.lime} 38%, ${colors.white} 50%, ${colors.lime} 62%)`,
        backgroundSize: `${SIZE * 100}% 100%`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        animation: `np-shine ${PERIOD_MS / 1000}s linear infinite`,
      },
    },
    text,
  );
}

/* iOS / Android: the text masks a gradient rect that moves like the CSS background */
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface Box {
  w: number;
  h: number;
  baseline: number;
}

function ShineNative({ text, style }: Props) {
  const [box, setBox] = useState<Box | null>(null);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: PERIOD_MS, easing: Easing.linear }), -1);
  }, [p]);

  const w = box?.w ?? 0;
  // background-position x% puts the image at (box - image) * x%; it runs from 130% to -130%
  const animatedProps = useAnimatedProps(() => {
    const pos = FROM - 2 * FROM * p.value;
    return { x: (w - SIZE * w) * pos };
  });

  // the 100deg line, in the rect's own (bounding box) units: 10° below horizontal
  const tilt = box ? (Math.tan(((ANGLE_DEG - 90) * Math.PI) / 180) * SIZE * box.w) / box.h / 2 : 0;

  return (
    <View>
      {/* measures the number and its baseline; invisible once the SVG draws */}
      <Text
        style={[style, { color: box ? 'transparent' : colors.lime }]}
        onTextLayout={(e) => {
          const line = e.nativeEvent.lines[0];
          if (line) setBox((b) => ({ w: line.width, h: b?.h ?? line.height, baseline: line.y + line.ascender }));
        }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBox((b) => ({ w: b?.w ?? width, h: height, baseline: b?.baseline ?? height * 0.8 }));
        }}
      >
        {text}
      </Text>
      {box && box.w > 0 ? (
        <Svg style={StyleSheet.absoluteFill} width={box.w} height={box.h} pointerEvents="none">
          <Defs>
            <LinearGradient id="np-shine" x1="0" y1={0.5 - tilt} x2="1" y2={0.5 + tilt}>
              <Stop offset="0.38" stopColor={colors.lime} />
              <Stop offset="0.5" stopColor={colors.white} />
              <Stop offset="0.62" stopColor={colors.lime} />
            </LinearGradient>
            <Mask id="np-shine-mask" x="0" y="0" width={box.w} height={box.h} maskUnits="userSpaceOnUse">
              <SvgText
                x="0"
                y={box.baseline}
                fill={colors.white}
                fontFamily={style.fontFamily}
                fontSize={style.fontSize}
              >
                {text}
              </SvgText>
            </Mask>
          </Defs>
          <AnimatedRect
            animatedProps={animatedProps}
            y="0"
            width={SIZE * box.w}
            height={box.h}
            fill="url(#np-shine)"
            mask="url(#np-shine-mask)"
          />
        </Svg>
      ) : null}
    </View>
  );
}
