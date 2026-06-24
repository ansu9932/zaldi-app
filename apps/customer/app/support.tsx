import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { colors, radius, spacing } from '../lib/brand';
import { LEGAL } from '../lib/legal';

const SUPPORT_PHONE = process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '';
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@moolyaindiapvtltd.com';
const SUPPORT_WHATSAPP = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? SUPPORT_PHONE;

const FAQS: { q: string; a: string }[] = [
  { q: 'How long does delivery take?', a: 'Most orders in Contai arrive in 15–30 minutes, depending on distance and weather. Your live ETA is shown on the tracking screen.' },
  { q: 'What is the delivery OTP?', a: 'When your order is out for delivery, a 4-digit OTP appears on the tracking screen. Share it with the rider only when you receive your order — it confirms a safe handover.' },
  { q: 'Can I cancel my order?', a: 'You can cancel for free before the store accepts the order. Once it is being prepared, contact support. Any online payment is refunded to the original method.' },
  { q: 'How do refunds work?', a: 'For prepaid (UPI) orders that are cancelled, the amount is refunded to your bank/UPI within 3–5 working days.' },
  { q: 'Why is there a delivery / rain fee?', a: 'The delivery fee covers distance to your address. During rain a small rain fee helps pay riders fairly. Both are shown clearly in your bill before you pay.' },
  { q: 'Do you deliver alcohol and tobacco?', a: 'Yes, but only to customers aged 18+. You must confirm your age and show a valid government ID to the rider at delivery.' },
];

export default function Support() {
  const [open, setOpen] = useState<number | null>(0);

  const call = () => SUPPORT_PHONE && Linking.openURL(`tel:${SUPPORT_PHONE}`);
  const whatsapp = () => SUPPORT_WHATSAPP && Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, '')}`);
  const email = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Need help with my next order')}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSoft }}>
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        <Text style={styles.title}>How can we help?</Text>
        <Text style={styles.sub}>We're here for any issue with your order, payment or delivery.</Text>

        <View style={styles.contactRow}>
          {!!SUPPORT_PHONE && (
            <TouchableOpacity style={styles.contactBtn} onPress={call}>
              <Text style={styles.contactEmoji}>📞</Text>
              <Text style={styles.contactText}>Call us</Text>
            </TouchableOpacity>
          )}
          {!!SUPPORT_WHATSAPP && (
            <TouchableOpacity style={styles.contactBtn} onPress={whatsapp}>
              <Text style={styles.contactEmoji}>💬</Text>
              <Text style={styles.contactText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.contactBtn} onPress={email}>
            <Text style={styles.contactEmoji}>✉️</Text>
            <Text style={styles.contactText}>Email</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Frequently asked questions</Text>
        {FAQS.map((f, i) => (
          <TouchableOpacity key={i} style={styles.faq} activeOpacity={0.8} onPress={() => setOpen(open === i ? null : i)}>
            <View style={styles.faqHead}>
              <Text style={styles.faqQ}>{f.q}</Text>
              <Text style={styles.faqChev}>{open === i ? '−' : '+'}</Text>
            </View>
            {open === i && <Text style={styles.faqA}>{f.a}</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.section}>Legal</Text>
        <TouchableOpacity style={styles.legalRow} activeOpacity={0.8} onPress={() => Linking.openURL(LEGAL.terms)}>
          <Text style={styles.legalText}>📄  Terms & Conditions</Text>
          <Text style={styles.legalChev}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.legalRow} activeOpacity={0.8} onPress={() => Linking.openURL(LEGAL.privacy)}>
          <Text style={styles.legalText}>🔒  Privacy Policy</Text>
          <Text style={styles.legalChev}>›</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>next · operated by {LEGAL.company} · Contai · We usually reply within a few minutes during delivery hours.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '900', color: colors.ink },
  sub: { color: colors.inkMuted, fontSize: 14, marginTop: 4, marginBottom: spacing.lg },
  contactRow: { flexDirection: 'row', gap: spacing.md },
  contactBtn: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  contactEmoji: { fontSize: 24 },
  contactText: { fontWeight: '800', color: colors.ink, fontSize: 13, marginTop: 6 },
  section: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: spacing.xl, marginBottom: spacing.md },
  faq: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  faqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { fontWeight: '700', color: colors.ink, fontSize: 14, flex: 1, paddingRight: 8 },
  faqChev: { fontSize: 22, fontWeight: '800', color: colors.primary },
  faqA: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  legalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  legalText: { fontWeight: '700', color: colors.ink, fontSize: 14 },
  legalChev: { fontSize: 22, fontWeight: '800', color: colors.inkFaint },
  footer: { textAlign: 'center', color: colors.inkFaint, fontSize: 12, marginTop: spacing.xl },
});
