import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors } from '@clean-crep/shared';
import { supabase } from '@/lib/supabase';
import { ensureCustomerProfile } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';

/**
 * Email/password sign-in + sign-up card. Used by the /sign-in screen and by the
 * Book screen's sign-in sheet (so a guest's booking selections survive login).
 * onSuccess fires once there is a session AND the customers row exists, so a
 * caller can place an order straight away.
 */
export function SignInForm({ subtitle, onSuccess }: { subtitle?: string; onSuccess?: () => void }) {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setInfo(null);
    if (!email || !password || (mode === 'signUp' && !name)) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signUp') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (signUpError) throw signUpError;
        if (!data.session || !data.user) {
          // Email confirmation is on: no session until they click the link.
          // The customers row is created on their first sign-in (see AuthProvider).
          setMode('signIn');
          setInfo('Account created. Check your email for the confirmation link, then sign in here.');
          return;
        }
        const { error: profileError } = await ensureCustomerProfile(data.user, name);
        if (profileError) throw profileError;
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        const metaName = data.user.user_metadata?.name;
        const { error: profileError } = await ensureCustomerProfile(
          data.user,
          typeof metaName === 'string' && metaName ? metaName : email.split('@')[0]
        );
        if (profileError) throw profileError;
      }
      onSuccess?.();
    } catch (e) {
      setError(friendlyError(e, mode));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 16, padding: 20 }}>
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 16, color: colors.navy, marginBottom: 4 }}>
        {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
      </Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.caption, marginBottom: 20 }}>
        {subtitle ?? (mode === 'signIn' ? 'Sign in to book and track your cleans.' : 'Book your first clean in a minute.')}
      </Text>

      {mode === 'signUp' && <Field label="NAME" value={name} onChangeText={setName} placeholder="Geego" />}
      <Field label="EMAIL" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
      <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

      {error && <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#993C1D', marginBottom: 12 }}>{error}</Text>}
      {info && <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#16A34A', marginBottom: 12 }}>{info}</Text>}

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

      <Pressable
        onPress={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
          setError(null);
          setInfo(null);
        }}
        style={{ marginTop: 16, alignItems: 'center' }}
      >
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.blue }}>
          {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </Pressable>
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
