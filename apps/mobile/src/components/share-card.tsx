import { useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { fontFamily } from '@clean-crep/shared';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui';
import { c, space } from '@/theme';

// Native share: render the watermarked card off-screen, snapshot it at
// 1080 × 1350 (Instagram portrait), hand the file to the share sheet.
// Web uses share-card.web.tsx (canvas).

export interface ShareProps {
  before: string;
  after: string;
  itemName: string;
  orderNumber: string;
  onPress?: () => void;
}

export const SHARE_W = 360; // logical size; captured at 3x
export const SHARE_H = 450;

export function ShareButton({ before, after, itemName, orderNumber, onPress }: ShareProps) {
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    onPress?.();
    setBusy(true);
    try {
      const uri = await captureRef(ref, { format: 'jpg', quality: 0.92, width: SHARE_W * 3, height: SHARE_H * 3 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: `${itemName} · Cleaned by Clean Crep`, UTI: 'public.jpeg' });
      }
    } catch (e) {
      console.warn('[share]', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        testID="share-photos"
        variant="secondary"
        label={busy ? 'Preparing…' : 'Share'}
        icon={<Icon name="share" size={18} color={c.navy} />}
        onPress={share}
        disabled={busy}
      />
      {/* Off-screen card that gets snapshotted. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: -10000, top: 0 }}>
        <ViewShot>
          <View ref={ref} collapsable={false}>
            <ShareCard before={before} after={after} itemName={itemName} orderNumber={orderNumber} />
          </View>
        </ViewShot>
      </View>
    </>
  );
}

/** The watermarked card: before | after, navy band with "Cleaned by Clean Crep". */
export function ShareCard({ before, after, itemName, orderNumber }: ShareProps) {
  const imgH = SHARE_H - 92;
  return (
    <View style={{ width: SHARE_W, height: SHARE_H, backgroundColor: c.navy }}>
      <View style={{ flexDirection: 'row', height: imgH, gap: 2 }}>
        {[
          { uri: before, label: 'BEFORE' },
          { uri: after, label: 'AFTER' },
        ].map((p) => (
          <View key={p.label} style={{ flex: 1 }}>
            <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            <Text style={{ position: 'absolute', top: 10, left: 10, fontFamily: fontFamily.bold, fontSize: 11, letterSpacing: 1.4, color: c.white, backgroundColor: 'rgba(10,31,68,0.72)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' }}>
              {p.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1, paddingHorizontal: space.md, justifyContent: 'center' }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 22, lineHeight: 26, color: c.white }}>Cleaned by Clean Crep</Text>
        <Text style={{ fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16, color: c.onNavyMuted, marginTop: 2 }} numberOfLines={1}>
          {itemName} · {orderNumber} · cleancrep.com
        </Text>
      </View>
    </View>
  );
}
