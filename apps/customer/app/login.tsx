import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { useStore } from '../lib/store';
import { LEGAL } from '../lib/legal';

export default function Login() {
  const insets = useSafeAreaInsets();
  const login = useStore((s) => s.login);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const valid = /^[6-9]\d{9}$/.test(phone);
  const canContinue = valid && accepted;

  function onContinue() {
    if (!canContinue) return;
    // DEMO login. Live = Supabase phone OTP (Stage: Go Live).
    login(phone, name.trim() || undefined);
    router.replace('/home');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={[styles.top, { paddingTop: insets.top + 60 }]}>
        <Text style={styles.logo}>
          next<Text style={styles.dot}>.</Text>
        </Text>
        <Text style={styles.tag}>Groceries & daily needs in minutes — in Contai.</Text>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.title}>Login or Sign up</Text>
        <Text style={styles.subtitle}>Enter your mobile number to continue</Text>

        <View style={styles.phoneRow}>
          <View style={styles.cc}>
            <Text style={styles.ccText}>🇮🇳 +91</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            placeholder="10-digit mobile number"
            placeholderTextColor={colors.inkFaint}
            keyboardType="number-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <TextInput
          style={styles.nameInput}
          placeholder="Your name (optional)"
          placeholderTextColor={colors.inkFaint}
          value={name}
          onChangeText={setName}
        />

        {/* One-time Terms & Privacy acceptance at sign-up */}
        <TouchableOpacity
          style={styles.acceptRow}
          activeOpacity={0.8}
          onPress={() => setAccepted((v) => !v)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
            {accepted && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.acceptText}>
            I agree to next's{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.terms)}>Terms &amp; Conditions</Text>
            {' '}and{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.privacy)}>Privacy Policy</Text>.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={onContinue}
          disabled={!canContinue}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Demo mode: enter any valid 10-digit number. Real OTP verification turns on when
          we connect the live backend.
        </Text>

        <Text style={styles.terms}>Operated by {LEGAL.company}.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: colors.ink, paddingHorizontal: spacing.xl, paddingBottom: 50 },
  logo: { fontSize: 48, fontWeight: '900', color: colors.white, letterSpacing: -2 },
  dot: { color: colors.primary, fontSize: 54 },
  tag: { color: colors.inkFaint, fontSize: 14, marginTop: 6, fontWeight: '500', maxWidth: 260 },

  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    marginTop: -28,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
  },
  title: { fontSize: 22, fontWeight: '900', color: colors.ink },
  subtitle: { color: colors.inkMuted, marginTop: 4, marginBottom: 24, fontSize: 14 },

  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  cc: {
    backgroundColor: colors.bgSoft,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ccText: { fontWeight: '800', color: colors.ink },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nameInput: {
    backgroundColor: colors.bgSoft,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 17,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: colors.border },
  btnText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  acceptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontWeight: '900', fontSize: 14 },
  acceptText: { flex: 1, color: colors.inkMuted, fontSize: 12.5, lineHeight: 18 },
  link: { color: colors.primaryDark, fontWeight: '800', textDecorationLine: 'underline' },
  note: { color: colors.inkFaint, fontSize: 12, marginTop: 16, lineHeight: 17 },
  terms: { color: colors.inkFaint, fontSize: 11, marginTop: 'auto', textAlign: 'center' },
});
