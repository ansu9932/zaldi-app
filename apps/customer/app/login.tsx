import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { useStore } from '../lib/store';

export default function Login() {
  const insets = useSafeAreaInsets();
  const login = useStore((s) => s.login);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const valid = /^[6-9]\d{9}$/.test(phone);

  function onContinue() {
    if (!valid) return;
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

        <TouchableOpacity
          style={[styles.btn, !valid && styles.btnDisabled]}
          onPress={onContinue}
          disabled={!valid}
        >
          <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Demo mode: enter any valid 10-digit number. Real OTP verification turns on when
          we connect the live backend.
        </Text>

        <Text style={styles.terms}>
          By continuing you agree to next's Terms & Privacy Policy.
        </Text>
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
  note: { color: colors.inkFaint, fontSize: 12, marginTop: 16, lineHeight: 17 },
  terms: { color: colors.inkFaint, fontSize: 11, marginTop: 'auto', textAlign: 'center' },
});
