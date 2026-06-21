import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from './brand';
import { signIn, useAuth } from './auth';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const setSession = useAuth((s) => s.setSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const res = await signIn(username, password);
    setBusy(false);
    if (res.ok && res.session) setSession(res.session);
    else setError(res.error ?? 'Login failed');
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.ink }}>
      <View style={[styles.wrap, { paddingTop: insets.top + 80 }]}>
        <Text style={styles.logo}>next<Text style={{ color: colors.primary }}>.</Text></Text>
        <Text style={styles.sub}>Merchant Partner Login</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} autoCapitalize="none" value={username} onChangeText={setUsername} placeholder="Your username" placeholderTextColor={colors.inkFaint} />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor={colors.inkFaint} />
          {error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={[styles.btn, busy && { opacity: 0.6 }]} onPress={onSubmit} disabled={busy}>
            <Text style={styles.btnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Your login is created by the next admin. Forgot password? Ask admin to reset it.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xl },
  logo: { fontSize: 44, fontWeight: '900', color: colors.white, letterSpacing: -2 },
  sub: { color: colors.inkFaint, fontSize: 14, marginTop: 4, marginBottom: 32, fontWeight: '600' },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.xl, width: '100%' },
  label: { fontSize: 12, fontWeight: '700', color: colors.inkMuted, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.bgSoft, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: colors.ink, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.error, fontSize: 13, marginTop: 12, fontWeight: '600' },
  btn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  btnText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  hint: { color: colors.inkFaint, fontSize: 12, marginTop: 16, textAlign: 'center', lineHeight: 17 },
});
