import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/icon';
import { StatusTag } from '@/components/status-tag';
import { OrderTicket, readyBy } from '@/components/order-ticket';
import { BeforeAfter, PhotosPending } from '@/components/before-after';
import { Button, Overline, ScreenHeader } from '@/components/ui';
import { useOrders } from '@/hooks/use-orders';
import { useOrderPhotos } from '@/hooks/use-order-photos';
import { useAuth } from '@/lib/auth';
import { tapLight } from '@/lib/haptics';
import { EmptyState, ErrorState, SignInPrompt, SkeletonList } from '@/components/states';
import { c, elevation, radius, space, type } from '@/theme';

const WHATSAPP_URL = 'https://wa.me/18765072163';

function shortDay(d: Date): string {
  return d.toLocaleDateString('en-JM', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function OrdersScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { orders, loading, error, reload } = useOrders();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sel = orders.find((o) => o.id === activeId) ?? orders[0];
  const completed = sel?.status === 'completed';
  const photos = useOrderPhotos(sel?.id ?? null, completed);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ScreenHeader title="Orders" subtitle="Track every pair, drop-off to pickup." />

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
        {!session && (
          <SignInPrompt
            title="Sign in to see your orders"
            body="Track every pair from drop-off to pickup, live."
            where="orders"
            onSignIn={() => router.push('/sign-in?next=/orders')}
          />
        )}
        {session && loading && <SkeletonList count={3} />}
        {session && !loading && error && <ErrorState message={error} onRetry={reload} />}
        {session && !loading && !error && orders.length === 0 && (
          <EmptyState
            title="No kicks in the queue yet."
            body="Let's fix that. Book your first clean and track it right here."
            actionLabel="Book a Clean"
            onAction={() => router.push('/book')}
          />
        )}

        {session && !loading && sel && (
          <View style={{ gap: space.md }}>
            <OrderTicket order={sel} />
            {completed && photos.before && photos.after && (
              <BeforeAfter before={photos.before} after={photos.after} itemName={sel.item_name} orderNumber={sel.order_number} />
            )}
            {completed && !photos.loading && !(photos.before && photos.after) && <PhotosPending />}
            <Button
              variant="secondary"
              label="Questions? WhatsApp us"
              icon={<Icon name="wa" size={18} color={c.navy} />}
              onPress={() => Linking.openURL(WHATSAPP_URL)}
            />
          </View>
        )}

        {session && !loading && orders.length > 1 && (
          <View style={{ gap: space.sm }}>
            <Overline>ALL ORDERS</Overline>
            {orders.map((o) => {
              const isActive = o.id === sel?.id;
              return (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    tapLight();
                    setActiveId(o.id);
                  }}
                  aria-selected={isActive}
                  style={[
                    {
                      backgroundColor: c.surface,
                      borderRadius: radius.md,
                      padding: space.md,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: space.sm,
                    },
                    isActive ? { borderWidth: 1.5, borderColor: c.accent } : elevation.card,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={type.bodyStrong} numberOfLines={1}>
                      {o.item_name}
                    </Text>
                    <Text style={type.caption}>
                      {o.order_number} · {o.service?.name ?? '—'} · Ready {shortDay(readyBy(o))}
                    </Text>
                  </View>
                  <StatusTag status={o.status} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
