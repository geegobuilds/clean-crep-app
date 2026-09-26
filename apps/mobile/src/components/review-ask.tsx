import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '@clean-crep/shared';
import { Icon } from '@/components/icon';

// TODO(Geego): replace with the shop's direct "Write a review" link from Google
// Business Profile (Home → "Ask for reviews" → copy link, e.g. https://g.page/r/XXXX/review).
// Until then this opens the Maps listing search.
export const GOOGLE_REVIEW_URL =
  'https://www.google.com/maps/search/?api=1&query=Clean+Crep+Jamaica+Pristine+Plaza+Half+Way+Tree';

const ASKED_KEY = 'review-ask-done-v1';

/**
 * Asks once, ever — and only after a customer has a completed order (they've
 * seen the result). Routes to Google Maps reviews, which is what a local
 * shop's discovery runs on, rather than an app-store rating.
 */
export function ReviewAsk({ itemName }: { itemName: string | null }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!itemName) return;
    let active = true;
    AsyncStorage.getItem(ASKED_KEY).then((v) => active && v !== '1' && setShow(true));
    return () => {
      active = false;
    };
  }, [itemName]);

  if (!show || !itemName) return null;

  async function done(openReview: boolean) {
    await AsyncStorage.setItem(ASKED_KEY, '1');
    setShow(false);
    if (openReview) Linking.openURL(GOOGLE_REVIEW_URL);
  }

  return (
    <View style={{ backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.blue, padding: 16 }}>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF9E7', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="star" size={17} color="#B45309" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontFamily: 'DMSans_500Medium', color: colors.navy, marginBottom: 3 }}>
            How did your {itemName} come out?
          </Text>
          <Text style={{ fontSize: 12, color: colors.caption, lineHeight: 17, fontFamily: 'DMSans_400Regular' }}>
            If we did you right, a quick Google review helps other people in Kingston find us.
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => done(false)} style={{ flex: 1, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, paddingVertical: 11, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.caption, fontFamily: 'DMSans_500Medium' }}>Not now</Text>
        </Pressable>
        <Pressable onPress={() => done(true)} style={{ flex: 1, borderRadius: radius.button, backgroundColor: colors.blue, paddingVertical: 11, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.white, fontFamily: 'DMSans_500Medium' }}>Leave a review</Text>
        </Pressable>
      </View>
    </View>
  );
}
