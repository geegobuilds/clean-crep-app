import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { type OrderStatus } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { PressScale } from '@/components/ui';
import { RotationRail } from '@/components/rotation-rail';
import { ClubCard } from '@/components/club-card';
import { useVault } from '@/hooks/use-vault';
import { useAuth } from '@/lib/auth';
import { success, tapLight } from '@/lib/haptics';
import { useOrders } from '@/hooks/use-orders';
import { useFeatures } from '@/hooks/use-features';
import { useNotifications } from '@/hooks/use-notifications';
import { ErrorState, SignInPrompt } from '@/components/states';
import { ReviewAsk } from '@/components/review-ask';
import { CreppieChat } from '@/components/creppie-chat';
import { c, radius, space, type } from '@/theme';

// Home (DESIGN.md §8):
//  - Three planes that move at different speeds: one huge word at the back
//    (half speed), Creppie with a clean shoe in the middle under a spotlight,
//    the Book button on top straddling the hero's edge.
//  - Blue only means "tap this". No middle sizes.
//  - A compact header fades in once the hero scrolls away.

const logo = require('../../../assets/brand/logo.png');
const creppieShoe = require('../../../assets/creppie/success.png');
const WHATSAPP_URL = 'https://wa.me/18765072163';
const HERO_H = 480;

const HERO_WORD: Partial<Record<OrderStatus, string>> = {
  received: 'RECEIVED',
  in_progress: 'CLEANING',
  ready_for_pickup: 'READY',
  pending_payment: 'READY',
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session, customer } = useAuth();
  const features = useFeatures();
  const { pairs, loading: vaultLoading, error: vaultError, reload: reloadVault } = useVault();
  // Home is always mounted, so it owns the "your pair is ready" success haptic.
  const { orders, loading: ordersLoading, error: ordersError, reload: reloadOrders } = useOrders({ onReady: () => success() });
  const activeOrders = orders.filter((o) => o.status !== 'completed');
  const lead = activeOrders[0] ?? null;
  const lastCompleted = orders.find((o) => o.status === 'completed') ?? null;
  const firstName = customer?.name?.split(' ')[0];
  const [chatOpen, setChatOpen] = useState(false);
  // The Inbox lives behind the bell; the badge says how many are unread.
  const { notifications } = useNotifications();
  const unread = session ? notifications.filter((n) => !n.read).length : 0;

  // Light status bar over the navy hero, dark again when leaving Home.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, [])
  );

  const word = (lead && HERO_WORD[lead.status]) || 'FRESH';
  const wordSize = Math.min(132, Math.floor((width - space.lg * 2) / (word.length * 0.7)));
  const pairName = lead ? lead.item_name.replace(/^\s*\d+\s*x\s*/i, '') : null;

  // Parallax: the word drifts at half speed and fades, Creppie lags and shrinks a touch.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const wordStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [-120, 0, HERO_H], [-30, 0, HERO_H * 0.5], Extrapolation.CLAMP) }],
    opacity: interpolate(scrollY.value, [0, HERO_H * 0.6], [1, 0], Extrapolation.CLAMP),
  }));
  const subjectStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-120, 0, HERO_H], [-10, 0, HERO_H * 0.25], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-120, 0, HERO_H], [1.08, 1, 0.9], Extrapolation.CLAMP) },
    ],
  }));
  const compactStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [HERO_H - 300, HERO_H - 230], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [HERO_H - 300, HERO_H - 230], [-8, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <View style={{ height: HERO_H, paddingTop: insets.top + space.md, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: 'hidden', backgroundColor: c.navy }}>
          {/* Rich navy: deeper at the top, a lift of blue towards the bottom */}
          <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={width} height={HERO_H}>
            <Defs>
              <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#061329" />
                <Stop offset="1" stopColor="#0E2A5C" />
              </LinearGradient>
              <RadialGradient id="spot" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#1A6FD4" stopOpacity="0.55" />
                <Stop offset="0.55" stopColor="#1A6FD4" stopOpacity="0.14" />
                <Stop offset="1" stopColor="#1A6FD4" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width={width} height={HERO_H} fill="url(#sky)" />
            {/* Spotlight behind the subject */}
            <Ellipse cx={width / 2} cy={HERO_H * 0.62} rx={width * 0.62} ry={HERO_H * 0.42} fill="url(#spot)" />
          </Svg>

          {/* Small stuff up top */}
          <View style={{ paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Image source={logo} style={{ width: 28, height: 28, borderRadius: 14 }} />
            <Text style={[type.caption, { color: c.onNavyMuted, flex: 1 }]}>{firstName ? `Hi, ${firstName}` : 'Clean Crep Jamaica'}</Text>
            <Pressable onPress={() => router.push('/inbox')} hitSlop={10} accessibilityRole="button" accessibilityLabel={unread ? `Inbox, ${unread} unread` : 'Inbox'}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.onNavyLine, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={17} color={c.white} />
              </View>
              {unread > 0 && (
                <View testID="inbox-badge" style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.accent, borderWidth: 2, borderColor: c.navy, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: c.white, fontSize: 10, lineHeight: 12, fontFamily: type.bodyStrong.fontFamily, fontVariant: ['tabular-nums'] }}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              )}
            </Pressable>
          </View>
          <Text style={[type.overline, { color: c.onNavyMuted, paddingHorizontal: space.lg, marginTop: space.lg }]}>
            {pairName ? `${pairName} · ${lead?.order_number}` : 'Sneakers · Clarks · Caps'}
          </Text>

          {/* Plane 1 (back): the one huge word, dropping in letter by letter */}
          <Animated.View testID="hero-word" style={[{ flexDirection: 'row', paddingHorizontal: space.lg - 4, marginTop: space.xxs }, wordStyle]} accessible accessibilityLabel={word}>
            {word.split('').map((ch, i) => (
              <Animated.Text
                key={`${word}-${i}`}
                entering={FadeInDown.delay(80 + i * 45).springify().damping(14)}
                style={{ fontFamily: type.display.fontFamily, fontSize: wordSize, lineHeight: wordSize * 1.02, letterSpacing: -wordSize * 0.04, color: c.white }}
              >
                {ch}
              </Animated.Text>
            ))}
          </Animated.View>

          {/* Plane 2 (middle): the subject under the spotlight, with a ground shadow */}
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: insets.top + 96 + wordSize * 0.45, alignItems: 'center' }, subjectStyle]}>
            <Svg width={220} height={40} style={{ position: 'absolute', top: 268 }}>
              <Defs>
                <RadialGradient id="ground" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#000" stopOpacity="0.45" />
                  <Stop offset="1" stopColor="#000" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Ellipse cx={110} cy={20} rx={110} ry={20} fill="url(#ground)" />
            </Svg>
            <Animated.Image
              entering={FadeInDown.delay(260).springify().damping(15)}
              source={creppieShoe}
              style={{ width: 300, height: 300 }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
        </View>

        {/* Plane 3 (top): the action, straddling the hero's edge */}
        <View style={{ paddingHorizontal: space.lg, marginTop: -30, gap: space.lg }}>
          <PressScale
            testID="hero-book"
            onPress={() => {
              tapLight();
              router.push('/book');
            }}
            accessibilityLabel={lead ? 'Book another clean' : 'Book a clean'}
            style={{
              height: 60,
              borderRadius: radius.pill,
              backgroundColor: c.accent,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: space.lg,
              paddingRight: 6,
              boxShadow: '0 14px 30px rgba(26,111,212,0.35), 0 2px 6px rgba(10,31,68,0.18)',
            }}
          >
            <Text style={[type.button, { color: c.white }]}>{lead ? 'Book another clean' : 'Book a clean'}</Text>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrowR" size={20} color={c.accent} strokeWidth={2} />
            </View>
          </PressScale>

          {session && ordersError && !ordersLoading && <ErrorState message={ordersError} onRetry={reloadOrders} />}
          {!session && (
            <SignInPrompt title="Track your cleans here" body="Sign in to see live updates on your pairs." where="home" onSignIn={() => router.push('/sign-in?next=/')} />
          )}

          {session && features.has('vault') && (
            <View style={{ marginHorizontal: -space.lg }}>
              <RotationRail pairs={pairs} loading={vaultLoading} error={vaultError} onRetry={reloadVault} />
            </View>
          )}

          {session && features.has('membership') && <ClubCard />}

          {session && !ordersLoading && <ReviewAsk itemName={lastCompleted?.item_name ?? null} />}

          {/* The human ways in, as quiet links (the hero already carries the one primary action). */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.md }}>
            <Pressable onPress={() => setChatOpen(true)} accessibilityRole="button" hitSlop={10}>
              <Text style={[type.bodyStrong, { color: c.accent }]}>Ask Creppie</Text>
            </Pressable>
            <Text style={type.caption}>·</Text>
            <Pressable onPress={() => Linking.openURL(WHATSAPP_URL)} accessibilityRole="button" hitSlop={10}>
              <Text style={[type.bodyStrong, { color: c.accent }]}>WhatsApp us</Text>
            </Pressable>
          </View>

          <Text style={[type.caption, { textAlign: 'center' }]}>Shop 19, Pristine Plaza, Half Way Tree</Text>
        </View>
      </Animated.ScrollView>

      {/* Compact header: fades in once the hero has scrolled away */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + space.xs,
            paddingBottom: space.sm,
            paddingHorizontal: space.lg,
            backgroundColor: 'rgba(6,19,41,0.94)',
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: space.xs,
          },
          compactStyle,
        ]}
      >
        <Text style={{ fontFamily: type.display.fontFamily, fontSize: 20, color: c.white, letterSpacing: -0.5 }}>{word}</Text>
        {pairName && <Text style={[type.caption, { color: c.onNavyMuted }]}>{pairName}</Text>}
      </Animated.View>

      {chatOpen && <CreppieChat onClose={() => setChatOpen(false)} />}
    </View>
  );
}
