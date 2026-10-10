import { useState } from 'react';
import { Image, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { gradesFor, pairTitle, passportUrl, type PairCategory } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { CreppieChat } from '@/components/creppie-chat';
import { StatusTag } from '@/components/status-tag';
import { Button, Card, Overline, PressScale, ScreenHeader } from '@/components/ui';
import { EmptyState, ErrorState, SignInPrompt, SkeletonList } from '@/components/states';
import { useFeatureState } from '@/hooks/use-features';
import { useVault, type VaultClean, type VaultPair } from '@/hooks/use-vault';
import { useAuth } from '@/lib/auth';
import { tapLight } from '@/lib/haptics';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { c, elevation, radius, space, type } from '@/theme';

// The Vault (docs/VISION.md, Phase 1): every pair the customer owns, with its
// care history and Crep Passport. Pairs appear on their own from orders
// (migration 0021); customers can add the rest. Hidden unless `vault` is on.

function day(iso: string): string {
  return new Date(iso).toLocaleDateString('en-JM', { day: 'numeric', month: 'short', year: 'numeric' });
}

function cleanedLine(p: VaultPair): string {
  const done = p.cleans.filter((o) => o.status === 'completed');
  if (!p.cleans.length) return 'Not cleaned with us yet';
  if (!done.length) return 'First clean in progress';
  return `Cleaned ${done.length}× · last ${day(done[0].created_at)}`;
}

/** The clean this item is in for right now (booked, cleaning or ready), if any. */
function activeClean(p: VaultPair): VaultClean | null {
  return p.cleans.find((o) => o.status !== 'completed') ?? null;
}

/** Short stage for a Vault item that's in for a clean. */
function stageLabel(o: VaultClean): string {
  if (o.status === 'in_progress') return 'Cleaning';
  if (o.status === 'ready_for_pickup') return o.drop_method === 'pickup' ? 'On its way back' : 'Ready for pickup';
  return 'Booked in';
}

export default function VaultScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tile = Math.floor((Math.min(width, 600) - space.lg * 2 - space.md) / 2);
  const { session } = useAuth();
  const { features, loaded } = useFeatureState();
  const { pairs, loading, error, reload, savePair, removePair } = useVault();
  const refresh = usePullRefresh(reload);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const open = pairs.find((p) => p.id === openId) ?? null;

  // Deep link to /vault while the feature is hidden: back to Home.
  if (loaded && !features.has('vault')) return <Redirect href="/" />;

  if (open) {
    return <PairDetail pair={open} showPassport={features.has('passport')} showGrade={features.has('condition_grade')} showCreppie={features.has('smart_nudges')} onBack={() => setOpenId(null)} onSave={(f) => savePair(open.id, f)} onRemove={async () => { const err = await removePair(open.id); if (!err) setOpenId(null); return err; }} onBook={() => router.push({ pathname: '/book', params: { pair: open.id } })} onTrack={() => router.push('/orders')} />;
  }

  const capCount = pairs.filter((p) => p.category === 'cap').length;
  const shoeCount = pairs.length - capCount;
  const cleans = pairs.reduce((n, p) => n + p.cleans.filter((o) => o.status === 'completed').length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScreenHeader title="Vault" subtitle="Your sneakers, Clarks and caps, and how we've cared for them." />
      <ScrollView refreshControl={session ? refresh : undefined} contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 140 }}>
        {!session && (
          <SignInPrompt
            title="Sign in to open your Vault"
            body="Everything you've had cleaned, with its full care history."
            where="vault"
            onSignIn={() => router.push('/sign-in?next=/vault')}
          />
        )}
        {session && loading && <SkeletonList count={3} />}
        {session && !loading && error && <ErrorState message={error} onRetry={reload} />}

        {session && !loading && !error && (
          <>
            <View style={{ flexDirection: 'row', gap: space.xl }}>
              {/* Caps are counted on their own: a cap is not a pair. */}
              {shoeCount > 0 && <Stat value={String(shoeCount)} label={shoeCount === 1 ? 'Pair' : 'Pairs'} />}
              {capCount > 0 && <Stat value={String(capCount)} label={capCount === 1 ? 'Cap' : 'Caps'} />}
              <Stat value={String(cleans)} label={cleans === 1 ? 'Clean' : 'Cleans'} />
            </View>

            {pairs.length === 0 && !adding && (
              <EmptyState
                title="Your Vault is empty."
                body="Your sneakers, Clarks and caps show up here after your first clean. Add the ones you already own too."
                actionLabel="Add to Vault"
                onAction={() => setAdding(true)}
              />
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
              {pairs.map((p) => {
                const n = p.cleans.filter((o) => o.status === 'completed').length;
                const active = activeClean(p);
                return (
                  <PressScale
                    key={p.id}
                    testID="vault-pair"
                    onPress={() => {
                      tapLight();
                      setOpenId(p.id);
                    }}
                    style={{ width: tile, gap: space.xs }}
                  >
                    <View>
                      <Cover pair={p} size={tile} />
                      {active && (
                        <View testID="vault-stage" style={{ position: 'absolute', left: space.sm, bottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.surface, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: space.xs }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent }} />
                          <Text style={[type.caption, { color: c.ink, fontFamily: type.bodyStrong.fontFamily }]}>{stageLabel(active)}</Text>
                        </View>
                      )}
                      {n > 0 && (
                        <View style={{ position: 'absolute', top: space.sm, right: space.sm, backgroundColor: c.surface, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: space.xs }}>
                          <Text style={[type.caption, { color: c.ink, fontVariant: ['tabular-nums'] }]}>{n}× clean</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ paddingHorizontal: 2 }}>
                      <Text style={type.bodyStrong} numberOfLines={1}>
                        {pairTitle(p)}
                      </Text>
                      <Text style={type.caption} numberOfLines={1}>
                        {p.colorway || cleanedLine(p)}
                      </Text>
                    </View>
                  </PressScale>
                );
              })}
            </View>

            {adding ? (
              <PairForm
                title="Add to your Vault"
                onCancel={() => setAdding(false)}
                onSave={async (f) => {
                  const err = await savePair(null, f);
                  if (!err) setAdding(false);
                  return err;
                }}
              />
            ) : (
              pairs.length > 0 && <Button variant="secondary" label="Add to Vault" onPress={() => setAdding(true)} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Text style={[type.hero, { fontSize: 56, lineHeight: 58, fontVariant: ['tabular-nums'] }]}>{value}</Text>
      <Text style={type.overline}>{label}</Text>
    </View>
  );
}

/** Latest after-photo, else a navy tile with the pair's initial. */
function Cover({ pair, size, wide }: { pair: VaultPair; size: number; wide?: boolean }) {
  const style = { width: wide ? '100%' : size, height: size, borderRadius: radius.lg } as const;
  if (pair.cover) return <Image source={{ uri: pair.cover }} style={style} resizeMode="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={[style, { backgroundColor: c.navy, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={[type.hero, { color: c.white, fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.46) }]}>{pairTitle(pair).charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** Context for Creppie: what the pair is and how we've cared for it. */
function creppieDraft(pair: VaultPair): string {
  const facts = [pair.colorway, pair.size && `size ${pair.size}`, pair.category === 'clarks' ? 'Clarks' : pair.category === 'cap' ? 'a cap' : null].filter(Boolean).join(', ');
  const done = pair.cleans.filter((o) => o.status === 'completed');
  const g = latestGrades(pair);
  const history = [
    done.length ? `cleaned ${done.length}× by you, last ${day(done[0].created_at)}` : 'not cleaned by you yet',
    g?.after ? `condition ${g.after.score}/10` : null,
  ]
    .filter(Boolean)
    .join(', ');
  return `About my ${pairTitle(pair)}${facts ? ` (${facts})` : ''}, ${history}: `;
}

/** The most recently graded clean: its before → after scores. */
function latestGrades(pair: VaultPair) {
  const last = [...pair.events].filter((e) => e.kind === 'grade').sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return last ? gradesFor(pair.events, last.order_id ?? undefined) : null;
}

function ConditionCard({ pair }: { pair: VaultPair }) {
  const g = latestGrades(pair);
  if (!g || !(g.before || g.after)) return null;
  const summary = (g.after ?? g.before)?.summary;
  return (
    <View testID="condition-card" style={[{ backgroundColor: c.surface, borderRadius: radius.lg + 4, padding: space.lg, gap: space.sm }, elevation.card]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Overline>Condition · AI graded</Overline>
        {g.restored !== null && g.restored > 0 && (
          <View style={{ backgroundColor: c.navy, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 }}>
            <Text style={[type.caption, { color: c.white, fontFamily: type.bodyStrong.fontFamily }]}>+{g.restored} restored</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.lg }}>
        {g.before && (
          <View>
            <Text style={[type.hero, { color: c.line, fontVariant: ['tabular-nums'] }]}>{g.before.score}</Text>
            <Text style={type.overline}>Before</Text>
          </View>
        )}
        {g.before && g.after && <Icon name="arrowR" size={22} color={c.inkMuted} />}
        {g.after && (
          <View>
            <Text style={[type.hero, { fontSize: 64, lineHeight: 66, fontVariant: ['tabular-nums'] }]}>
              {g.after.score}
              <Text style={[type.title, { color: c.inkMuted }]}>/10</Text>
            </Text>
            <Text style={type.overline}>After</Text>
          </View>
        )}
      </View>
      {!!summary && <Text style={[type.body, { color: c.inkMuted }]}>{summary}</Text>}
    </View>
  );
}

function PairDetail({
  pair,
  showPassport,
  showGrade,
  showCreppie,
  onBack,
  onSave,
  onRemove,
  onBook,
  onTrack,
}: {
  pair: VaultPair;
  showPassport: boolean;
  showGrade: boolean;
  showCreppie: boolean;
  onBack: () => void;
  onSave: (f: PairFields) => Promise<string | null>;
  onRemove: () => Promise<string | null>;
  onBook: () => void;
  onTrack: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState<'ask' | 'busy' | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const details = [pair.colorway, pair.size && `Size ${pair.size}`].filter(Boolean).join(' · ');
  const { width } = useWindowDimensions();
  const done = pair.cleans.filter((o) => o.status === 'completed');
  const active = activeClean(pair);
  const g = latestGrades(pair);
  const stats = [
    { label: done.length === 1 ? 'Clean' : 'Cleans', value: String(done.length) },
    ...(showGrade && g?.after ? [{ label: 'Condition', value: `${g.after.score}/10` }] : []),
    { label: 'Last clean', value: done.length ? new Date(done[0].created_at).toLocaleDateString('en-JM', { day: 'numeric', month: 'short' }) : '—' },
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <ScreenHeader
          title={pairTitle(pair)}
          subtitle={details || (pair.nickname && pair.nickname !== pairTitle(pair) ? pair.nickname : undefined)}
          left={
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Vault" hitSlop={12}>
              <Icon name="chevronL" size={20} color={c.navy} />
            </Pressable>
          }
          right={pair.nickname && pair.nickname !== pairTitle(pair) ? <Text style={type.overline}>{pair.nickname}</Text> : undefined}
        />
        <View style={{ paddingHorizontal: space.lg, gap: space.xl }}>
          <Cover pair={pair} size={pair.cover ? Math.min(width, 600) - space.lg * 2 : 200} wide />

          {/* The numbers that matter, big and bare */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {stats.map((st) => (
              <View key={st.label}>
                <Text style={[type.title, { fontSize: 30, lineHeight: 34, fontVariant: ['tabular-nums'] }]}>{st.value}</Text>
                <Text style={type.overline}>{st.label}</Text>
              </View>
            ))}
          </View>

          {/* In for a clean right now: say so here instead of offering another booking. */}
          {active && (
            <View testID="pair-in-clean" style={[{ backgroundColor: c.navy, borderRadius: radius.lg + 4, padding: space.lg, gap: space.xxs }, elevation.raised]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />
                <Text style={[type.overline, { color: c.onNavyMuted }]}>In for a clean</Text>
              </View>
              <Text style={[type.title, { color: c.white }]}>{stageLabel(active)}</Text>
              <Text style={[type.caption, { color: c.onNavyMuted }]}>
                {active.service?.name ?? 'Clean'} · {active.order_number}
              </Text>
            </View>
          )}

          <PressScale
            testID={active ? 'pair-track' : 'pair-book'}
            onPress={active ? onTrack : onBook}
            style={{
              height: 60,
              borderRadius: radius.pill,
              backgroundColor: c.accent,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: space.lg,
              paddingRight: 6,
              boxShadow: '0 14px 30px rgba(26,111,212,0.3), 0 2px 6px rgba(10,31,68,0.16)',
            }}
          >
            <Text style={[type.button, { color: c.white }]}>{active ? 'Track this clean' : done.length ? 'Book its next clean' : 'Book its first clean'}</Text>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="arrowR" size={20} color={c.accent} strokeWidth={2} />
            </View>
          </PressScale>

          {showGrade && <ConditionCard pair={pair} />}

          {showPassport && (
            <View testID="passport-card" style={[{ backgroundColor: c.navy, borderRadius: radius.lg + 4, padding: space.lg, gap: space.sm, overflow: 'hidden' }, elevation.raised]}>
              <View style={{ position: 'absolute', right: -70, top: -70, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(26,111,212,0.35)' }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[type.overline, { color: c.onNavyMuted }]}>Crep Passport</Text>
                <Text style={[type.overline, { color: c.onNavyMuted }]}>Verified</Text>
              </View>
              <Text style={[type.hero, { color: c.white, fontSize: 34, lineHeight: 40, letterSpacing: 5 }]}>{pair.passport_code}</Text>
              <Text style={[type.caption, { color: c.onNavyMuted }]}>
                Care history verified by Clean Crep. Share it when you sell, or scan the Crep Card in your pickup bag.
              </Text>
              <Button
                variant="onDark"
                compact
                label="Share passport"
                icon={<Icon name="share" size={16} color={c.white} />}
                onPress={() => Share.share({ message: `${pairTitle(pair)}: verified care history by Clean Crep ${passportUrl(pair.passport_code)}`, url: passportUrl(pair.passport_code) })}
              />
            </View>
          )}

          {/* Care history as a timeline */}
          <View style={{ gap: space.sm }}>
            <Overline>Care history</Overline>
            {pair.cleans.length === 0 ? (
              <Text style={[type.body, { color: c.inkMuted }]}>No cleans yet. Book one and it shows up here.</Text>
            ) : (
              <View style={[{ backgroundColor: c.surface, borderRadius: radius.lg + 4, paddingVertical: space.sm, paddingHorizontal: space.md }, elevation.card]}>
                {pair.cleans.map((o, i) => {
                  const last = i === pair.cleans.length - 1;
                  const doneHere = o.status === 'completed';
                  return (
                    <View key={o.id} style={{ flexDirection: 'row', gap: space.md }}>
                      <View style={{ alignItems: 'center', width: 14 }}>
                        <View style={{ height: space.md + 4, width: 2, backgroundColor: i === 0 ? 'transparent' : c.line }} />
                        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: doneHere ? c.navy : c.surface, borderWidth: 2, borderColor: c.navy }} />
                        <View style={{ flex: 1, width: 2, backgroundColor: last ? 'transparent' : c.line }} />
                      </View>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.line }}>
                        <View style={{ flex: 1 }}>
                          <Text style={type.bodyStrong}>{o.service?.name ?? 'Clean'}</Text>
                          <Text style={type.caption}>
                            {day(o.created_at)} · {o.order_number}
                          </Text>
                        </View>
                        <StatusTag status={o.status} method={o.drop_method} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {editing ? (
            <PairForm
              title="Edit details"
              initial={pair}
              onCancel={() => setEditing(false)}
              onSave={async (f) => {
                const err = await onSave(f);
                if (!err) setEditing(false);
                return err;
              }}
            />
          ) : (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {showCreppie && (
                <Button variant="secondary" label="Ask Creppie" onPress={() => setAsking(true)} style={{ flex: 1 }} />
              )}
              <Button variant="secondary" label="Edit details" onPress={() => setEditing(true)} style={{ flex: 1 }} />
            </View>
          )}
          {/* Only never-cleaned items can go: anything we've cleaned keeps its care history. */}
          {pair.cleans.length === 0 && !editing && (
            <View style={{ alignItems: 'center', gap: space.xs }}>
              {removing === null ? (
                <Pressable onPress={() => setRemoving('ask')} hitSlop={8} accessibilityRole="button">
                  <Text style={[type.bodyStrong, { color: c.danger }]}>Remove from Vault</Text>
                </Pressable>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <Text style={type.body}>Remove {pairTitle(pair)}?</Text>
                  <Pressable
                    testID="confirm-remove"
                    onPress={async () => {
                      setRemoving('busy');
                      const err = await onRemove();
                      setRemoveError(err);
                      if (err) setRemoving(null);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                  >
                    <Text style={[type.bodyStrong, { color: c.danger }]}>{removing === 'busy' ? 'Removing…' : 'Remove'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setRemoving(null)} hitSlop={8} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: c.inkMuted }]}>Cancel</Text>
                  </Pressable>
                </View>
              )}
              {removeError && <Text style={[type.caption, { color: c.danger }]}>{removeError}</Text>}
            </View>
          )}
        </View>
        {asking && <CreppieChat draft={creppieDraft(pair)} onClose={() => setAsking(false)} />}
      </ScrollView>
    </SafeAreaView>
  );
}

type PairFields = { brand: string; model: string; colorway: string; size: string; nickname: string; category: PairCategory };

const CATEGORIES: { key: PairCategory; label: string }[] = [
  { key: 'sneaker', label: 'Sneakers' },
  { key: 'clarks', label: 'Clarks' },
  { key: 'cap', label: 'Cap' },
  { key: 'other', label: 'Other' },
];

function PairForm({
  title,
  initial,
  onSave,
  onCancel,
}: {
  title: string;
  initial?: Partial<VaultPair>;
  onSave: (f: PairFields) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [f, setF] = useState<PairFields>({
    brand: initial?.brand ?? '',
    model: initial?.model ?? '',
    colorway: initial?.colorway ?? '',
    size: initial?.size ?? '',
    nickname: initial?.nickname ?? '',
    category: initial?.category ?? 'sneaker',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof PairFields) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const canSave = !!(f.brand.trim() || f.model.trim() || f.nickname.trim());

  return (
    <Card style={{ gap: space.sm }}>
      <Text style={type.headline}>{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {CATEGORIES.map((cat) => {
          const on = f.category === cat.key;
          return (
            <Pressable
              key={cat.key}
              onPress={() => setF((p) => ({ ...p, category: cat.key }))}
              aria-checked={on}
              accessibilityRole="radio"
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? c.navy : c.line, backgroundColor: on ? c.navy : c.surface }}
            >
              <Text style={[type.caption, { color: on ? c.white : c.ink }]}>{cat.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Field label="Brand" placeholder="Nike" value={f.brand} onChangeText={set('brand')} />
      <Field label="Model" placeholder="Air Force 1" value={f.model} onChangeText={set('model')} />
      <Field label="Colorway" placeholder="Triple White" value={f.colorway} onChangeText={set('colorway')} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Field label="Size" placeholder="10" value={f.size} onChangeText={set('size')} />
        </View>
        <View style={{ flex: 2 }}>
          <Field label="Nickname" placeholder="Sunday pair" value={f.nickname} onChangeText={set('nickname')} />
        </View>
      </View>
      {err && <Text style={[type.caption, { color: c.danger }]}>{err}</Text>}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button variant="secondary" compact label="Cancel" onPress={onCancel} style={{ flex: 1 }} />
        <Button
          compact
          label={busy ? 'Saving…' : 'Save'}
          disabled={!canSave || busy}
          style={{ flex: 1 }}
          onPress={async () => {
            setBusy(true);
            const e = await onSave(f);
            setBusy(false);
            setErr(e);
          }}
        />
      </View>
    </Card>
  );
}

function Field({ label, ...input }: { label: string; placeholder: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={type.overline}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={c.inkMuted}
        style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: c.bg, ...type.body }}
      />
    </View>
  );
}
