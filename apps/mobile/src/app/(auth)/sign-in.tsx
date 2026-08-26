import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';

const logo = require('../../../assets/brand/logo.png');

export default function SignInScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!email || !password || (mode === 'signUp' && !name)) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signUp') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('customers').insert({ id: data.user.id, name, email });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

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

            <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 20 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.navy, marginBottom: 4 }}>
                {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.caption, marginBottom: 20 }}>
                {mode === 'signIn' ? 'Sign in to book and track your cleans.' : 'Book your first clean in a minute.'}
              </Text>

              {mode === 'signUp' && (
                <Field label="NAME" value={name} onChangeText={setName} placeholder="Geego" />
              )}
              <Field label="EMAIL" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
              <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

              {error && (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#993C1D', marginBottom: 12 }}>{error}</Text>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={{
                  backgroundColor: colors.blue,
                  borderRadius: 8,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: submitting ? 0.6 : 1,
                  marginTop: 4,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>
                  {submitting ? 'Please wait…' : mode === 'signIn' ? 'Sign In' : 'Create Account'}
                </Text>
              </Pressable>

              <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.blue }}>
                  {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}) {
  const { label, ...inputProps } = props;
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: colors.caption, letterSpacing: 2, marginBottom: 8 }}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.caption}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingVertical: 11,
          paddingHorizontal: 14,
          fontSize: 13,
          fontFamily: 'DMSans_400Regular',
          color: colors.charcoal,
        }}
      />
    </View>
  );
}
