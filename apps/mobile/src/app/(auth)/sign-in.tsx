import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useCallback } from 'react';
import { SignInForm } from '@/components/sign-in-form';
import { c, space, type } from '@/theme';

const logo = require('../../../assets/brand/logo.png');
const creppie = require('../../../assets/creppie/signin.png');

// Same language as Home: a navy hero with a spotlight and one big line of type,
// Creppie waving from behind the sheet, and the form on a sheet that rises up.
// Where to land after signing in is handled by (auth)/_layout via ?next=.
export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const heroH = Math.max(300, Math.min(360, height * 0.42));

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.navy }}>
      <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={height}>
        <Defs>
          <LinearGradient id="ssky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#061329" />
            <Stop offset="1" stopColor="#0E2A5C" />
          </LinearGradient>
          <RadialGradient id="sspot" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#1A6FD4" stopOpacity="0.55" />
            <Stop offset="0.55" stopColor="#1A6FD4" stopOpacity="0.12" />
            <Stop offset="1" stopColor="#1A6FD4" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#ssky)" />
        <Ellipse cx={width * 0.72} cy={heroH * 0.7} rx={width * 0.55} ry={heroH * 0.45} fill="url(#sspot)" />
      </Svg>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={{ height: heroH, paddingTop: insets.top + space.md, paddingHorizontal: space.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Image source={logo} style={{ width: 30, height: 30, borderRadius: 15 }} />
              <Text style={[type.caption, { color: c.onNavyMuted, flex: 1 }]}>Clean Crep Jamaica</Text>
              <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                <Text style={[type.bodyStrong, { color: c.onNavyMuted }]}>Not now</Text>
              </Pressable>
            </View>
            <Animated.Text
              entering={FadeInDown.delay(80).springify().damping(15)}
              style={[type.hero, { color: c.white, fontSize: 46, lineHeight: 48, marginTop: space.xl, maxWidth: width * 0.62 }]}
            >
              Your gear, looked after.
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(180).springify().damping(15)} style={[type.body, { color: c.onNavyMuted, marginTop: space.sm, maxWidth: width * 0.55 }]}>
              Clean Crep, for a Clean Step.
            </Animated.Text>
            {/* Creppie waves from behind the sheet */}
            <Animated.Image
              entering={FadeInUp.delay(260).springify().damping(14)}
              source={creppie}
              resizeMode="contain"
              style={{ position: 'absolute', right: -8, bottom: -26, width: width * 0.48, height: width * 0.48 }}
              accessibilityIgnoresInvertColors
            />
          </View>

          {/* The sheet */}
          <Animated.View
            entering={FadeInUp.delay(120).springify().damping(18)}
            style={{
              flexGrow: 1,
              backgroundColor: c.surface,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: space.lg,
              paddingTop: space.xl,
              paddingBottom: insets.bottom + space.lg,
            }}
          >
            <SignInForm bare />
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ marginTop: space.sm, alignItems: 'center', paddingVertical: space.xs }}>
              <Text style={[type.caption, { color: c.inkMuted }]}>Just browsing? Continue without an account</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
