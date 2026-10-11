import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { isDue, pairTitle } from '@clean-crep/shared';
import { CreppieArt } from '@/components/creppie';
import { activeClean, Cover, stageLabel, StagePill } from '@/components/pair-cover';
import { ErrorState, Skeleton } from '@/components/states';
import { Button, Card, PressScale } from '@/components/ui';
import type { VaultPair } from '@/hooks/use-vault';
import { tapLight } from '@/lib/haptics';
import { c, elevation, radius, space, type } from '@/theme';

const TILE = 140;

function lastCleaned(p: VaultPair): number {
  const done = p.cleans.find((o) => o.status === 'completed');
  return done ? Date.parse(done.created_at) : 0;
}

/** In a clean first, then due, then most recently cleaned. */
function rank(p: VaultPair): number {
  if (activeClean(p)) return 3e13;
  if (isDue(p.cleans)) return 2e13 + lastCleaned(p);
  return lastCleaned(p);
}

function subline(p: VaultPair): string {
  const active = activeClean(p);
  if (active) return stageLabel(active);
  const done = p.cleans.find((o) => o.status === 'completed');
  if (!done) return 'Not cleaned yet';
  return `Cleaned ${new Date(done.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

/**
 * Home's "Your rotation": the customer's own Vault, one swipe wide. An item
 * that's due goes straight to Book for it; the rest open in the Vault.
 */
export function RotationRail({ pairs, loading, error, onRetry }: { pairs: VaultPair[]; loading: boolean; error: string | null; onRetry: () => void }) {
  const router = useRouter();
  const sorted = [...pairs].sort((a, b) => rank(b) - rank(a));

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: space.lg }}>
        <Text style={type.overline}>Your rotation</Text>
        {pairs.length > 0 && (
          <Text onPress={() => router.push('/vault')} accessibilityRole="link" style={[type.bodyStrong, { color: c.accent, fontSize: 14 }]}>
            See all
          </Text>
        )}
      </View>

      {error && !loading && (
        <View style={{ paddingHorizontal: space.lg }}>
          <ErrorState message={error} onRetry={onRetry} />
        </View>
      )}

      {!error && !loading && pairs.length === 0 && (
        <View style={{ paddingHorizontal: space.lg }}>
          <Card bordered style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <CreppieArt mood="empty" size={64} />
            <View style={{ flex: 1, gap: space.xs }}>
              <Text style={type.bodyStrong}>Your rotation lives here.</Text>
              <Text style={type.caption}>Every pair, Clarks and cap you clean with us lands in your Vault.</Text>
              <Button variant="secondary" compact label="Add what you own" onPress={() => router.push('/vault?add=1')} style={{ alignSelf: 'flex-start', marginTop: space.xxs }} />
            </View>
          </Card>
        </View>
      )}

      {(loading || (!error && pairs.length > 0)) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TILE + space.sm}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}
        >
          {loading && pairs.length === 0
            ? [0, 1, 2].map((i) => (
                <View key={i} style={{ width: TILE, gap: space.xs }}>
                  <Skeleton width={TILE} height={TILE} style={{ borderRadius: radius.lg }} />
                  <Skeleton width={100} height={13} />
                  <Skeleton width={70} height={13} />
                </View>
              ))
            : sorted.map((p, i) => {
                const active = activeClean(p);
                const due = !active && isDue(p.cleans);
                return (
                  <Animated.View key={p.id} entering={FadeInDown.delay(80 + i * 60).springify().damping(16)}>
                    <PressScale
                      testID="rotation-item"
                      accessibilityLabel={due ? `Book a clean for ${pairTitle(p)}` : pairTitle(p)}
                      onPress={() => {
                        tapLight();
                        router.push(due ? `/book?pair=${p.id}` : `/vault?pair=${p.id}`);
                      }}
                      style={{ width: TILE, gap: space.xs }}
                    >
                      <View>
                        <Cover pair={p} size={TILE} />
                        {due && (
                          <View style={{ position: 'absolute', top: space.sm, left: space.sm, backgroundColor: c.navy, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8 }}>
                            <Text style={[type.caption, { color: c.white, fontFamily: type.bodyStrong.fontFamily }]}>Due a clean</Text>
                          </View>
                        )}
                        {active && (
                          <View style={{ position: 'absolute', left: space.sm, bottom: space.sm }}>
                            <StagePill clean={active} />
                          </View>
                        )}
                      </View>
                      <View style={{ paddingHorizontal: 2 }}>
                        <Text style={type.bodyStrong} numberOfLines={1}>
                          {pairTitle(p)}
                        </Text>
                        <Text style={type.caption} numberOfLines={1}>
                          {subline(p)}
                        </Text>
                      </View>
                    </PressScale>
                  </Animated.View>
                );
              })}
          {!loading && pairs.length > 0 && (
            <PressScale testID="rotation-add" accessibilityLabel="Add to Vault" onPress={() => router.push('/vault?add=1')} style={{ width: TILE, gap: space.xs }}>
              <View style={[{ width: TILE, height: TILE, borderRadius: radius.lg, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }, elevation.bordered]}>
                <Text style={{ fontSize: 34, lineHeight: 38, color: c.navy, fontFamily: type.display.fontFamily }}>+</Text>
              </View>
              <Text style={[type.caption, { paddingHorizontal: 2 }]}>Add to Vault</Text>
            </PressScale>
          )}
        </ScrollView>
      )}
    </View>
  );
}
