import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, radius } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { dismissPushOffer, enablePush, shouldOfferPush } from '@/lib/push';

/**
 * In-app explainer shown right after a booking, before the OS permission
 * prompt: tells the customer exactly what they'll get and why. Asking cold on
 * launch gets denied, and a denial can't be re-asked from the app.
 */
export function PushOffer() {
  const [state, setState] = useState<'hidden' | 'offer' | 'on'>('hidden');

  useEffect(() => {
    let active = true;
    shouldOfferPush().then((offer) => active && offer && setState('offer'));
    return () => {
      active = false;
    };
  }, []);

  if (state === 'hidden') return null;

  if (state === 'on') {
    return (
      <View style={{ backgroundColor: '#DCFCE7', borderRadius: radius.card, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', width: '100%', marginBottom: 20 }}>
        <Icon name="check" size={18} color="#16A34A" strokeWidth={2} />
        <Text style={{ flex: 1, fontSize: 12, color: colors.navy, fontFamily: 'DMSans_500Medium' }}>
          Updates on. We&apos;ll ping you the moment your pair is ready.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 16, width: '100%', marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.ice, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={17} color={colors.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans_500Medium', color: colors.navy, marginBottom: 3 }}>
            Get a heads-up when it&apos;s ready?
          </Text>
          <Text style={{ fontSize: 12, color: colors.caption, lineHeight: 17, fontFamily: 'DMSans_400Regular' }}>
            Only updates on your orders: received, being cleaned, ready for pickup. No spam.
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={async () => {
            await dismissPushOffer();
            setState('hidden');
          }}
          style={{ flex: 1, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, paddingVertical: 11, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, color: colors.caption, fontFamily: 'DMSans_500Medium' }}>Not now</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            const status = await enablePush();
            setState(status === 'granted' ? 'on' : 'hidden');
          }}
          style={{ flex: 1, borderRadius: radius.button, backgroundColor: colors.blue, paddingVertical: 11, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 13, color: colors.white, fontFamily: 'DMSans_500Medium' }}>Turn on updates</Text>
        </Pressable>
      </View>
    </View>
  );
}
