import { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@clean-crep/shared';
import { useAuth } from '@/lib/auth';
import { askCreppie, loadChat, saveChat, WHATSAPP_URL, type CreppieMsg } from '@/lib/creppie';
import { SignInForm } from '@/components/sign-in-form';
import { track } from '@/lib/analytics';

// "Ask Creppie" in the app: a floating face button that opens a full-screen
// chat. Anyone can ask questions; booking needs an account, so when Creppie
// answers needsSignIn a guest gets a sign-in card, and once signed in we ask
// him to go ahead, and the booking lands on their account.

const face = require('../../assets/creppie/face.png');
const wave = require('../../assets/creppie/wave-upper.png');

const GREETING = "Wah gwaan! I'm Creppie, Clean Crep's assistant. Ask me about prices, turnaround, pickup, or book a clean right here.";
const QUICK = ['How much for sneakers?', 'Book a clean', 'Do you do pickup?'];
const AFTER_SIGN_IN = "I've signed in, please go ahead and book it.";

type Msg = CreppieMsg & { needsSignIn?: boolean };

/** Creppie's replies can carry a WhatsApp link; make links tappable. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <Text style={{ fontSize: 13, lineHeight: 19, color: colors.charcoal, fontFamily: 'DMSans_400Regular' }}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <Text key={i} style={{ color: colors.blue, fontFamily: 'DMSans_500Medium' }} onPress={() => Linking.openURL(p.replace(/[.,)]+$/, ''))}>
            {p.includes('wa.me') ? 'Open WhatsApp' : p}
          </Text>
        ) : (
          p
        )
      )}
    </Text>
  );
}

/** Floating "Ask Creppie" button. Place it as the last child of a screen's root view. */
export function CreppieButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => {
          setOpen(true);
          track('creppie_chat_opened', { platform: 'app' });
        }}
        accessibilityRole="button"
        accessibilityLabel="Ask Creppie"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.navy,
          borderRadius: 30,
          paddingVertical: 4,
          paddingLeft: 4,
          paddingRight: 14,
          shadowColor: '#0A1F44',
          shadowOpacity: 0.25,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Image source={face} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ice }} />
        <Text style={{ color: colors.white, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Ask Creppie</Text>
      </Pressable>
      {open && <CreppieChat onClose={() => setOpen(false)} />}
    </>
  );
}

/** The chat sheet. `draft` pre-fills the message box (e.g. a Vault pair's details). */
export function CreppieChat({ onClose, draft: initialDraft = '' }: { onClose: () => void; draft?: string }) {
  // Insets from the app's root provider. Measuring inside the Modal (its own native window) is
  // racy: on some opens it reads 0 and the header, with its close button, slides under the status bar.
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [sessionId, setSessionId] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const listRef = useRef<ScrollView>(null);

  useEffect(() => {
    let live = true;
    loadChat().then((s) => {
      if (!live) return;
      setSessionId(s.sessionId);
      setMsgs(s.msgs);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (sessionId) saveChat({ sessionId, msgs });
  }, [sessionId, msgs]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending || !sessionId) return;
    setDraft('');
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    setSending(true);
    track('creppie_message_sent');
    const { reply, needsSignIn } = await askCreppie(sessionId, message);
    setMsgs((m) => [...m, { role: 'creppie', text: reply, needsSignIn }]);
    setSending(false);
  }

  const last = msgs[msgs.length - 1];
  const showSignInCard = !session && !sending && last?.role === 'creppie' && last.needsSignIn;

  useEffect(() => {
    if (showSignInCard) track('signin_prompted', { where: 'creppie_chat' });
  }, [showSignInCard]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.offWhite }}>
        <View style={{ paddingTop: insets.top, backgroundColor: colors.navy }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.navy }}>
          <Image source={face} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ice }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: 15, fontFamily: 'DMSans_500Medium' }}>Creppie</Text>
            <Text style={{ color: colors.softBlue, fontSize: 11, fontFamily: 'DMSans_400Regular' }}>Clean Crep&apos;s assistant · replies in seconds</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close chat">
            <Text style={{ color: colors.white, fontSize: 26, lineHeight: 28 }}>×</Text>
          </Pressable>
        </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            ref={listRef}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          >
            <Image source={wave} style={{ width: 138, height: 120, alignSelf: 'center' }} accessibilityLabel="Creppie waving" />
            <Bubble role="creppie" text={GREETING} />
            {msgs.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.text} />
            ))}
            {sending && <Bubble role="creppie" text="…" />}

            {showSignInCard && (
              <View style={{ backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 10 }}>
                <Text style={{ fontSize: 14, color: colors.navy, fontFamily: 'DMSans_500Medium' }}>Sign in to book</Text>
                <Text style={{ fontSize: 12, color: colors.caption, lineHeight: 18, fontFamily: 'DMSans_400Regular' }}>
                  Your booking goes on your account, so you can track it in Orders, get updates, and earn points.
                </Text>
                <Pressable onPress={() => setSigningIn(true)} style={{ backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: colors.white, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Sign in or create account</Text>
                </Pressable>
              </View>
            )}

            {msgs.length === 0 && !sending && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {QUICK.map((q) => (
                  <Pressable key={q} onPress={() => send(q)} style={{ borderWidth: 1, borderColor: colors.blue, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 12, color: colors.blue, fontFamily: 'DMSans_500Medium' }}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask Creppie anything…"
              placeholderTextColor={colors.caption}
              multiline
              maxLength={500}
              accessibilityLabel="Message"
              style={{
                flex: 1,
                maxHeight: 110,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 9,
                fontSize: 13,
                color: colors.charcoal,
                fontFamily: 'DMSans_400Regular',
              }}
            />
            <Pressable
              onPress={() => send(draft)}
              disabled={!draft.trim() || sending}
              accessibilityRole="button"
              accessibilityLabel="Send"
              style={{ backgroundColor: !draft.trim() || sending ? colors.border : colors.blue, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 16 }}
            >
              <Text style={{ color: colors.white, fontSize: 13, fontFamily: 'DMSans_500Medium' }}>Send</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.white }}>
        <Pressable onPress={() => Linking.openURL(WHATSAPP_URL)} style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: colors.white }}>
          <Text style={{ fontSize: 11, color: colors.caption, fontFamily: 'DMSans_400Regular' }}>
            Prefer a human? <Text style={{ color: colors.blue, fontFamily: 'DMSans_500Medium' }}>WhatsApp the team</Text>
          </Text>
        </Pressable>
        </View>
      </View>

      {/* Sign-in sheet over the chat, so the conversation is still there afterwards. */}
      <Modal visible={signingIn} animationType="slide" transparent onRequestClose={() => setSigningIn(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,31,68,0.55)' }}>
          <View style={{ paddingBottom: insets.bottom, backgroundColor: colors.navy, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 15, fontFamily: 'DMSans_500Medium', color: colors.white }}>One last step</Text>
                <Pressable onPress={() => setSigningIn(false)} hitSlop={12}>
                  <Text style={{ fontSize: 13, fontFamily: 'DMSans_500Medium', color: colors.softBlue }}>Cancel</Text>
                </Pressable>
              </View>
              <SignInForm
                subtitle="Sign in so Creppie can put this booking on your account. We'll send you updates on your pair."
                onSuccess={() => {
                  setSigningIn(false);
                  send(AFTER_SIGN_IN);
                }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}

function Bubble({ role, text }: { role: CreppieMsg['role']; text: string }) {
  const mine = role === 'user';
  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        backgroundColor: mine ? colors.blue : colors.white,
        borderWidth: mine ? 0 : 1,
        borderColor: colors.border,
        borderRadius: 14,
        borderBottomRightRadius: mine ? 4 : 14,
        borderBottomLeftRadius: mine ? 14 : 4,
        paddingVertical: 9,
        paddingHorizontal: 12,
      }}
    >
      {mine ? (
        <Text style={{ fontSize: 13, lineHeight: 19, color: colors.white, fontFamily: 'DMSans_400Regular' }}>{text}</Text>
      ) : (
        <Linkified text={text} />
      )}
    </View>
  );
}
