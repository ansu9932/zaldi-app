import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import * as Location from 'expo-location';
import { colors, radius, spacing } from '../lib/brand';
import { useStore } from '../lib/store';

const LABELS = ['Home', 'Work', 'Other'];

export default function AddressScreen() {
  const insets = useSafeAreaInsets();
  const { addresses, addAddress, selectAddress, name, phone } = useStore();
  const [showForm, setShowForm] = useState(addresses.length === 0);

  // form state
  const [label, setLabel] = useState('Home');
  const [rcName, setRcName] = useState(name ?? '');
  const [rcPhone, setRcPhone] = useState(phone ?? '');
  const [line, setLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  async function pinCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setAccuracy(pos.coords.accuracy ?? null);
    } catch {}
    setLocating(false);
  }

  useEffect(() => {
    if (showForm && !pin) pinCurrentLocation();
  }, [showForm]);

  const valid = rcName.trim() && /^[6-9]\d{9}$/.test(rcPhone) && line.trim() && pin;

  function save() {
    if (!valid || !pin) return;
    addAddress({
      label,
      name: rcName.trim(),
      phone: rcPhone,
      line: line.trim(),
      landmark: landmark.trim(),
      lat: pin.lat,
      lng: pin.lng,
    });
    router.back();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bgSoft }}
    >
      <Stack.Screen options={{ title: 'Delivery address' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}>
        {/* Saved addresses */}
        {addresses.length > 0 && (
          <>
            <Text style={styles.section}>Saved addresses</Text>
            {addresses.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.savedCard}
                onPress={() => {
                  selectAddress(a.id);
                  router.back();
                }}
              >
                <Text style={styles.savedLabel}>
                  {a.label === 'Home' ? '🏠' : a.label === 'Work' ? '🏢' : '📍'} {a.label}
                </Text>
                <Text style={styles.savedName}>{a.name} · {a.phone}</Text>
                <Text style={styles.savedLine}>{a.line}{a.landmark ? `, ${a.landmark}` : ''}</Text>
              </TouchableOpacity>
            ))}
            {!showForm && (
              <TouchableOpacity style={styles.addNewBtn} onPress={() => setShowForm(true)}>
                <Text style={styles.addNewText}>＋ Add a new address</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Add new form */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.section}>Add delivery details</Text>

            {/* GPS pin */}
            <View style={styles.pinCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pinTitle}>📍 Location pin</Text>
                {locating ? (
                  <Text style={styles.pinSub}>Getting accurate location…</Text>
                ) : pin ? (
                  <Text style={styles.pinSub}>
                    Pinned: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                    {accuracy ? `  (±${Math.round(accuracy)} m)` : ''}
                  </Text>
                ) : (
                  <Text style={styles.pinSub}>Not set</Text>
                )}
              </View>
              {locating ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <TouchableOpacity onPress={pinCurrentLocation} style={styles.pinBtn}>
                  <Text style={styles.pinBtnText}>Use current</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Label chips */}
            <View style={styles.chips}>
              {LABELS.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.chip, label === l && styles.chipActive]}
                  onPress={() => setLabel(l)}
                >
                  <Text style={[styles.chipText, label === l && styles.chipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field label="Receiver name *" value={rcName} onChange={setRcName} placeholder="Full name" />
            <Field
              label="Phone number *"
              value={rcPhone}
              onChange={setRcPhone}
              placeholder="10-digit mobile"
              keyboardType="number-pad"
              maxLength={10}
            />
            <Field
              label="House / Flat / Building / Street *"
              value={line}
              onChange={setLine}
              placeholder="e.g. House 12, Netaji Sarani"
            />
            <Field
              label="Area / Landmark"
              value={landmark}
              onChange={setLandmark}
              placeholder="e.g. near Contai Bus Stand"
            />

            <TouchableOpacity style={[styles.saveBtn, !valid && styles.saveBtnDisabled]} onPress={save} disabled={!valid}>
              <Text style={styles.saveText}>Save & deliver here</Text>
            </TouchableOpacity>
            {!valid && <Text style={styles.hint}>Please fill name, valid phone, address line, and set the pin.</Text>}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, maxLength,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
  savedCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  savedLabel: { fontWeight: '800', color: colors.ink, fontSize: 14 },
  savedName: { color: colors.inkMuted, fontSize: 13, marginTop: 4 },
  savedLine: { color: colors.inkMuted, fontSize: 13, marginTop: 2 },
  addNewBtn: { borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  addNewText: { color: colors.primaryDark, fontWeight: '800' },

  form: { marginTop: spacing.sm },
  pinCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  pinTitle: { fontWeight: '800', color: colors.ink, fontSize: 14 },
  pinSub: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  pinBtn: { backgroundColor: colors.white, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  pinBtnText: { color: colors.primaryDark, fontWeight: '800', fontSize: 12 },

  chips: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontWeight: '700', color: colors.inkMuted, fontSize: 13 },
  chipTextActive: { color: colors.white },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.inkMuted, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.ink, borderWidth: 1, borderColor: colors.border },

  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginTop: spacing.md },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveText: { color: colors.white, fontWeight: '900', fontSize: 16 },
  hint: { color: colors.inkFaint, fontSize: 12, marginTop: 8, textAlign: 'center' },
});
