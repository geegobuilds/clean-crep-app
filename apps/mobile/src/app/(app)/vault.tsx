import { useState } from 'react';
import { Image, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { gradesFor, pairTitle, passportUrl, type PairCategory } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { StatusTag } from '@/components/status-tag';
import { Button, Card, Overline, ScreenHeader } from '@/components/ui';
import { EmptyState, ErrorState, SignInPrompt, SkeletonList } from '@/components/states';
import { useFeatureState } from '@/hooks/use-features';
import { useVault, type VaultPair } from '@/hooks/use-vault';
import { useAuth } from '@/lib/auth';
import { tapLight } from '@/lib/haptics';
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

export default function VaultScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { features, loaded } = useFeatureState();
  const { pairs, loading, error, reload, savePair } = useVault();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const open = pairs.find((p) => p.id === openId) ?? null;

  // Deep link to /vault while the feature is hidden: back to Home.
  if (loaded && !features.has('vault')) return <Redirect href="/" />;

  if (open) {
    return <PairDetail pair={open} showPassport={features.has('passport')} showGrade={features.has('condition_grade')} onBack={() => setOpenId(null)} onSave={(f) => savePair(open.id, f)} onBook={() => router.push('/book')} />;
  }

  const cleans = pairs.reduce((n, p) => n + p.cleans.filter((o) => o.status === 'completed').length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScreenHeader title="Vault" subtitle="Every pair you own, and how we've cared for it." />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl }}>
        {!session && (
          <SignInPrompt
            title="Sign in to open your Vault"
            body="Every pair you've had cleaned, with its full care history."
            where="vault"
            onSignIn={() => router.push('/sign-in?next=/vault')}
          />
        )}
        {session && loading && <SkeletonList count={3} />}
        {session && !loading && error && <ErrorState message={error} onRetry={reload} />}

        {session && !loading && !error && (
          <>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Stat value={String(pairs.length)} label={pairs.length === 1 ? 'Pair' : 'Pairs'} />
              <Stat value={String(cleans)} label={cleans === 1 ? 'Clean' : 'Cleans'} />
            </View>

            {pairs.length === 0 && !adding && (
              <EmptyState
                title="Your Vault is empty."
                body="Pairs show up here after your first clean. Add the ones you already own too."
                actionLabel="Add a pair"
                onAction={() => setAdding(true)}
              />
            )}

            {pairs.map((p) => (
              <Pressable
                key={p.id}
                testID="vault-pair"
                onPress={() => {
                  tapLight();
                  setOpenId(p.id);
                }}
                style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md }, elevation.card]}
              >
                <Cover pair={p} size={72} />
                <View style={{ flex: 1 }}>
                  <Text style={type.bodyStrong} numberOfLines={1}>
                    {pairTitle(p)}
                  </Text>
                  {!!p.colorway && (
                    <Text style={type.caption} numberOfLines={1}>
                      {p.colorway}
                    </Text>
                  )}
                  <Text style={[type.caption, { marginTop: 2 }]}>{cleanedLine(p)}</Text>
                </View>
                <Icon name="chevronR" size={18} color={c.inkMuted} />
              </Pressable>
            ))}

            {adding ? (
              <PairForm
                title="Add a pair"
                onCancel={() => setAdding(false)}
                onSave={async (f) => {
                  const err = await savePair(null, f);
                  if (!err) setAdding(false);
                  return err;
                }}
              />
            ) : (
              pairs.length > 0 && <Button variant="secondary" label="Add a pair" onPress={() => setAdding(true)} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={[{ flex: 1, backgroundColor: c.surface, borderRadius: radius.md, padding: space.md }, elevation.card]}>
      <Text style={type.priceLg}>{value}</Text>
      <Text style={type.overline}>{label}</Text>
    </View>
  );
}

/** Latest after-photo, else a navy tile with the pair's initial. */
function Cover({ pair, size, wide }: { pair: VaultPair; size: number; wide?: boolean }) {
  const style = { width: wide ? '100%' : size, height: size, borderRadius: wide ? radius.lg : radius.md } as const;
  if (pair.cover) return <Image source={{ uri: pair.cover }} style={style} resizeMode="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={[style, { backgroundColor: c.navy, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={[type.title, { color: c.white, fontSize: wide ? 44 : 26, lineHeight: wide ? 48 : 30 }]}>{pairTitle(pair).charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** The most recently graded clean: its before → after scores. */
function latestGrades(pair: VaultPair) {
  const last = [...pair.events].filter((e) => e.kind === 'grade').sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return last ? gradesFor(pair.events, last.order_id ?? undefined) : null;
}

function ConditionCard({ pair }: { pair: VaultPair }) {
  const g = latestGrades(pair);
  if (!g || !(g.before || g.after)) return null;
  return (
    <Card testID="condition-card" style={{ gap: space.sm }}>
      <Overline>Condition · AI graded</Overline>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {g.before && (
          <View>
            <Text style={type.caption}>Before</Text>
            <Text style={[type.priceLg, { color: c.inkMuted }]}>{g.before.score}</Text>
          </View>
        )}
        {g.before && g.after && <Icon name="arrowR" size={20} color={c.inkMuted} />}
        {g.after && (
          <View>
            <Text style={type.caption}>After</Text>
            <Text style={type.priceLg}>
              {g.after.score}
              <Text style={[type.body, { color: c.inkMuted }]}>/10</Text>
            </Text>
          </View>
        )}
        {g.restored !== null && g.restored > 0 && (
          <View style={{ marginLeft: 'auto', backgroundColor: c.ice, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 }}>
            <Text style={[type.bodyStrong, { color: c.accent }]}>+{g.restored} restored</Text>
          </View>
        )}
      </View>
      {!!(g.after ?? g.before)?.summary && <Text style={type.caption}>{(g.after ?? g.before)!.summary}</Text>}
    </Card>
  );
}

function PairDetail({
  pair,
  showPassport,
  showGrade,
  onBack,
  onSave,
  onBook,
}: {
  pair: VaultPair;
  showPassport: boolean;
  showGrade: boolean;
  onBack: () => void;
  onSave: (f: PairFields) => Promise<string | null>;
  onBook: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const details = [pair.colorway, pair.size && `Size ${pair.size}`].filter(Boolean).join(' · ');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScreenHeader
        title={pairTitle(pair)}
        subtitle={details || (pair.nickname && pair.nickname !== pairTitle(pair) ? pair.nickname : undefined)}
        left={
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to Vault" hitSlop={12}>
            <Icon name="chevronL" size={24} color={c.navy} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        {!!pair.cover && <Cover pair={pair} size={220} wide />}
        {showGrade && <ConditionCard pair={pair} />}

        {showPassport && (
          <View testID="passport-card" style={{ backgroundColor: c.navy, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}>
            <Text style={[type.overline, { color: c.onNavyMuted }]}>Crep Passport</Text>
            <Text style={[type.title, { color: c.white, letterSpacing: 4 }]}>{pair.passport_code}</Text>
            <Text style={[type.caption, { color: c.onNavyMuted }]}>
              Verified care history by Clean Crep. Share it when you sell, or scan the Crep Tag in the box.
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

        <View style={{ gap: space.sm }}>
          <Overline>Care history</Overline>
          {pair.cleans.length === 0 && (
            <Card bordered>
              <Text style={type.caption}>No cleans yet. Book one and it shows up here.</Text>
            </Card>
          )}
          {pair.cleans.map((o) => (
            <Card key={o.id} bordered style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: o.status === 'completed' ? c.accent : c.line }} />
              <View style={{ flex: 1 }}>
                <Text style={type.bodyStrong}>{o.service?.name ?? 'Clean'}</Text>
                <Text style={type.caption}>
                  {day(o.created_at)} · {o.order_number}
                </Text>
              </View>
              <StatusTag status={o.status} />
            </Card>
          ))}
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
          <Button variant="secondary" label="Edit details" onPress={() => setEditing(true)} />
        )}
        <Button label="Book a clean" onPress={onBook} />
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
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.ice : c.surface }}
            >
              <Text style={[type.caption, { color: on ? c.accent : c.ink }]}>{cat.label}</Text>
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
        style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.sm, paddingVertical: 11, paddingHorizontal: 14, ...type.body }}
      />
    </View>
  );
}
