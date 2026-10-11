import { Image, Text, View } from 'react-native';
import { pairTitle } from '@clean-crep/shared';
import type { VaultClean, VaultPair } from '@/hooks/use-vault';
import { c, radius, type } from '@/theme';

// Shared by the Vault and the Home rail: how a Vault item looks and what it's up to.

export function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function cleanedLine(p: VaultPair): string {
  const done = p.cleans.filter((o) => o.status === 'completed');
  if (!p.cleans.length) return 'Not cleaned with us yet';
  if (!done.length) return 'First clean in progress';
  return `Cleaned ${done.length}× · last ${shortDay(done[0].created_at)}`;
}

/** The clean this item is in for right now (booked, cleaning or ready), if any. */
export function activeClean(p: VaultPair): VaultClean | null {
  return p.cleans.find((o) => o.status !== 'completed') ?? null;
}

/** Short stage for a Vault item that's in for a clean. */
export function stageLabel(o: VaultClean): string {
  if (o.status === 'in_progress') return 'Cleaning';
  if (o.status === 'ready_for_pickup') return o.drop_method === 'pickup' ? 'On its way back' : 'Ready for pickup';
  return 'Booked in';
}

/** Latest after-photo, else a navy tile with the item's initial. */
export function Cover({ pair, size, wide }: { pair: VaultPair; size: number; wide?: boolean }) {
  const style = { width: wide ? '100%' : size, height: size, borderRadius: radius.lg } as const;
  if (pair.cover) return <Image source={{ uri: pair.cover }} style={style} resizeMode="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={[style, { backgroundColor: c.navy, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={[type.hero, { color: c.white, fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.46) }]}>{pairTitle(pair).charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** The white pill on a cover saying where an item in for a clean is up to. */
export function StagePill({ clean }: { clean: VaultClean }) {
  return (
    <View testID="vault-stage" style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.surface, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.navy }} />
      <Text style={[type.caption, { color: c.ink, fontFamily: type.bodyStrong.fontFamily }]}>{stageLabel(clean)}</Text>
    </View>
  );
}
