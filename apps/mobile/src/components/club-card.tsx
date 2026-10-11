import { Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { formatPrice } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { PressScale } from '@/components/ui';
import { useMembership } from '@/hooks/use-membership';
import { tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, type } from '@/theme';

/**
 * Home's Club card. Members see their care credits (navy, like the wallet card
 * in the Club); everyone else gets one line on why the Club pays for itself.
 */
export function ClubCard() {
  const router = useRouter();
  const { membership, plans, loading } = useMembership();
  if (loading) return null;
  const go = () => {
    tapLight();
    router.push('/club' as Href);
  };

  if (membership && membership.status !== 'cancelled') {
    const status =
      membership.status === 'pending' ? 'One step left · send your reference' : membership.status === 'paused' ? 'Paused · renew to use your credits' : null;
    return (
      <PressScale testID="home-club" onPress={go} accessibilityLabel="Clean Crep Club" style={[{ backgroundColor: c.navy, borderRadius: radius.lg, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }, elevation.card]}>
        <View style={{ flex: 1 }}>
          <Text style={[type.overline, { color: c.onNavyMuted }]}>Club · {membership.plan.name}</Text>
          {status ? (
            <Text style={[type.bodyStrong, { color: c.white, marginTop: space.xs }]}>{status}</Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.xxs }}>
              <Text style={[type.hero, { color: c.white, fontVariant: ['tabular-nums'] }]}>{membership.balance}</Text>
              <Text style={[type.caption, { color: c.onNavyMuted }]}>care credit{membership.balance === 1 ? '' : 's'}</Text>
            </View>
          )}
        </View>
        <Icon name="chevronR" size={20} color={c.white} />
      </PressScale>
    );
  }

  const cheapest = [...plans].sort((a, b) => a.price_cents - b.price_cents)[0];
  if (!cheapest) return null;
  return (
    <PressScale testID="home-club" onPress={go} accessibilityLabel="Clean Crep Club" style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }, elevation.card]}>
      <View style={{ flex: 1, gap: space.xxs }}>
        <Text style={type.overline}>Clean Crep Club</Text>
        <Text style={type.body}>
          Cleans every month from {formatPrice(cheapest.price_cents)}. Unused ones roll over.
        </Text>
      </View>
      <Icon name="chevronR" size={20} color={c.inkMuted} />
    </PressScale>
  );
}
