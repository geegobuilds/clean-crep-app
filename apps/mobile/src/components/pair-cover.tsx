import { useState } from 'react';
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

// `sampleCorner`: where the "Sample" chip sits, so it clears a tile's own badges
// (the stage pill is bottom-left on every tile).
type Corner = 'top-left' | 'top-right' | 'bottom-right';
const CORNERS: Record<Corner, { top?: number; bottom?: number; left?: number; right?: number }> = {
  'top-left': { top: 8, left: 8 },
  'top-right': { top: 8, right: 8 },
  'bottom-right': { bottom: 8, right: 8 },
};

/**
 * The item's product shot (cutout, on white like a store listing), else its
 * latest after photo, else a stock sample tagged "Sample", else a navy tile
 * with its initial.
 */
export function Cover({ pair, size, wide, sampleCorner = 'bottom-right' }: { pair: VaultPair; size: number; wide?: boolean; sampleCorner?: Corner }) {
  const style = { width: wide ? '100%' : size, height: size, borderRadius: radius.lg } as const;
  // A cover that won't load (offline, CDN down) falls back to the initial tile.
  const [broken, setBroken] = useState<string | null>(null);
  const cover = pair.cover && broken !== pair.cover ? pair.cover : null;
  const onError = () => setBroken(pair.cover);
  if (cover && pair.coverKind === 'cutout') {
    return (
      <View style={[style, { backgroundColor: c.surface, padding: Math.round(size * 0.08) }]}>
        <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="contain" onError={onError} accessibilityIgnoresInvertColors />
      </View>
    );
  }
  if (cover) {
    return (
      <View>
        <Image source={{ uri: cover }} style={style} resizeMode="cover" onError={onError} accessibilityIgnoresInvertColors />
        {pair.coverKind === 'sample' && (
          <View testID="cover-sample" style={{ position: 'absolute', ...CORNERS[sampleCorner], backgroundColor: 'rgba(10,31,68,0.72)', borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 7 }}>
            <Text style={[type.caption, { fontSize: 11, lineHeight: 14, color: c.white }]}>Sample</Text>
          </View>
        )}
      </View>
    );
  }
  return (
    <View style={[style, { backgroundColor: c.navy, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={[type.hero, { color: c.white, fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.46) }]}>{pairTitle(pair).charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** A white pill on a white product-shot tile needs an edge to read. */
export function pillEdge(pair: VaultPair) {
  return pair.coverKind === 'cutout' ? { borderWidth: 1, borderColor: c.line } : null;
}

/** The white pill on a cover saying where an item in for a clean is up to. */
export function StagePill({ clean, pair }: { clean: VaultClean; pair?: VaultPair }) {
  return (
    <View testID="vault-stage" style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.surface, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8 }, pair && pillEdge(pair)]}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.navy }} />
      <Text style={[type.caption, { color: c.ink, fontFamily: type.bodyStrong.fontFamily }]}>{stageLabel(clean)}</Text>
    </View>
  );
}
