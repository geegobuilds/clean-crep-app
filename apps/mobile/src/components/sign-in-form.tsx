import { forwardRef, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { PressScale } from '@/components/ui';
import { c, elevation, radius, space, type } from '@/theme';
import { supabase } from '@/lib/supabase';
import { ensureCustomerProfile } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { track } from '@/lib/analytics';
import { openPrivacy, openTerms } from '@/lib/legal';

/**
 * Email/password sign-in + sign-up card. Used by the /sign-in screen and by the
 * Book screen's sign-in sheet (so a guest's booking selections survive login).
 * onSuccess fires once there is a session AND the customers row exists, so a
 * caller can place an order straight away.
 */
export function SignInForm({ subtitle, onSuccess, bare }: { subtitle?: string; onSuccess?: () => void; bare?: boolean }) {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
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
      track('signin_completed');
      onSuccess?.();
    } catch (e) {
      setError(friendlyError(e, mode));
    } finally {
      setSubmitting(false);
    }
  }

  const isSignUp = mode === 'signUp';
  return (
    <View style={bare ? null : [{ backgroundColor: c.surface, borderRadius: radius.lg + 4, padding: space.lg }, elevation.raised]}>
      <Text style={type.title}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
      <Text style={[type.body, { color: c.inkMuted, marginTop: space.xxs, marginBottom: space.lg }]}>
        {subtitle ?? (isSignUp ? 'Book your first clean in a minute.' : 'Sign in to book and track your cleans.')}
      </Text>

      {isSignUp && (
        <Field label="NAME" value={name} onChangeText={setName} placeholder="Geego" autoComplete="name" textContentType="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
      )}
      <Field
        ref={emailRef}
        label="EMAIL"
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Field
        ref={passwordRef}
        label="PASSWORD"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        textContentType={isSignUp ? 'newPassword' : 'password'}
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        accessory={
          <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            <Text style={[type.caption, { color: c.ink, fontFamily: type.bodyStrong.fontFamily }]}>{showPassword ? 'Hide' : 'Show'}</Text>
          </Pressable>
        }
      />

      {error && <Text style={[type.body, { color: c.danger, marginBottom: space.sm }]}>{error}</Text>}
      {info && <Text style={[type.body, { color: c.ink, marginBottom: space.sm }]}>{info}</Text>}

      <PressScale
        testID="auth-submit"
        onPress={() => {
          if (!submitting) handleSubmit();
        }}
        style={{
          marginTop: space.xs,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: c.accent,
          opacity: submitting ? 0.6 : 1,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 26px rgba(26,111,212,0.3), 0 2px 6px rgba(10,31,68,0.14)',
        }}
      >
        <Text style={[type.button, { color: c.white }]}>{submitting ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}</Text>
      </PressScale>

      {isSignUp && (
        <Text style={[type.caption, { textAlign: 'center', marginTop: space.sm }]}>
          By creating an account you agree to our{' '}
          <Text accessibilityRole="link" onPress={openTerms} style={{ color: c.ink, textDecorationLine: 'underline' }}>
            Terms
          </Text>{' '}
          and{' '}
          <Text accessibilityRole="link" onPress={openPrivacy} style={{ color: c.ink, textDecorationLine: 'underline' }}>
            Privacy Policy
          </Text>
          .
        </Text>
      )}

      <Pressable
        onPress={() => {
          setMode(isSignUp ? 'signIn' : 'signUp');
          setError(null);
          setInfo(null);
        }}
        hitSlop={8}
        style={{ marginTop: space.md, alignItems: 'center', paddingVertical: space.xs }}
      >
        <Text style={[type.bodyStrong, { color: c.accent }]}>{isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}</Text>
      </Pressable>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  accessory?: ReactNode;
} & Pick<
  TextInputProps,
  'placeholder' | 'secureTextEntry' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'textContentType' | 'returnKeyType' | 'onSubmitEditing'
>;

/** Filled field: soft fill at rest, a navy outline while you type in it. */
const Field = forwardRef<TextInput, FieldProps>(function Field({ label, accessory, ...inputProps }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.overline, { marginBottom: space.xs }]}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: focused ? c.surface : c.bg,
          borderWidth: 1.5,
          borderColor: focused ? c.navy : 'transparent',
          borderRadius: radius.md,
          paddingRight: accessory ? space.md : 0,
        }}
      >
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label.charAt(0) + label.slice(1).toLowerCase()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={c.inkMuted}
          style={{ flex: 1, minHeight: 52, paddingHorizontal: space.md, fontFamily: type.body.fontFamily, fontSize: 16, color: c.ink }}
        />
        {accessory}
      </View>
    </View>
  );
});
