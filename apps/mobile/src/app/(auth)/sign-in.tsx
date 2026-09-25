import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@clean-crep/shared';
import { SignInForm } from '@/components/sign-in-form';

const logo = require('../../../assets/brand/logo.png');

// Where to land after signing in is handled by (auth)/_layout via ?next=.
export default function SignInScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <Image source={logo} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 16 }} />
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 18, color: colors.white }}>Clean Crep Jamaica</Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.softBlue, marginTop: 4 }}>
                Clean Crep, for a Clean Step.
              </Text>
            </View>

            <SignInForm />

            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={{ marginTop: 20, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.softBlue }}>
                Just browsing? Continue without an account
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
