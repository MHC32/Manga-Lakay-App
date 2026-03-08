// src/screens/profile/EditProfileScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {useAuthStore} from '../../stores/auth.store';
import {userService} from '../../services/firebase/user.service';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import {ProfileStackParamList} from '../../types/navigation.types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type Props = StackScreenProps<ProfileStackParamList, 'EditProfile'>;

// ─── Données ──────────────────────────────────────────────────────────────────

const AVATAR_EMOJIS = ['🌺', '🦁', '🐉', '⚔️', '🌊', '🔥', '💀', '🌸', '⚡', '🎭', '🌀', '👾'];

const GENRES: {key: string; label: string; emoji: string}[] = [
  {key: 'action',         label: 'Action',         emoji: '⚔️'},
  {key: 'romance',        label: 'Romance',         emoji: '💕'},
  {key: 'horreur',        label: 'Horreur',         emoji: '👻'},
  {key: 'fantasy',        label: 'Fantasy',         emoji: '🧙'},
  {key: 'comedie',        label: 'Comédie',         emoji: '😂'},
  {key: 'drame',          label: 'Drame',            emoji: '🎭'},
  {key: 'sport',          label: 'Sport',            emoji: '⚽'},
  {key: 'scifi',          label: 'Sci-Fi',           emoji: '🚀'},
  {key: 'tranche-de-vie', label: 'Tranche de vie',  emoji: '☕'},
  {key: 'mystere',        label: 'Mystère',          emoji: '🔍'},
  {key: 'aventure',       label: 'Aventure',         emoji: '🗺️'},
  {key: 'shoujo',         label: 'Shoujo',           emoji: '🌸'},
];

const COUNTRIES = [
  {code: 'HT', label: '🇭🇹 Haïti'},
  {code: 'FR', label: '🇫🇷 France'},
  {code: 'US', label: '🇺🇸 États-Unis'},
  {code: 'DO', label: '🇩🇴 Rép. Dominicaine'},
  {code: 'BR', label: '🇧🇷 Brésil'},
  {code: 'CL', label: '🇨🇱 Chili'},
  {code: 'CA', label: '🇨🇦 Canada'},
  {code: 'OTHER', label: '🌍 Autre'},
];

// ─── Composant Toggle Switch ──────────────────────────────────────────────────

const ToggleSwitch = ({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) => (
  <TouchableOpacity
    style={[styles.toggle, value && styles.toggleActive]}
    onPress={onToggle}
    activeOpacity={0.8}>
    <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
  </TouchableOpacity>
);

// ─── Écran ────────────────────────────────────────────────────────────────────

const EditProfileScreen = ({navigation}: Props) => {
  const {user, refreshProfile} = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [country, setCountry] = useState(user?.country ?? 'HT');
  const [avatarEmoji, setAvatarEmoji] = useState(user?.avatarEmoji ?? '🌺');
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(
    new Set(user?.favoriteGenres ?? []),
  );
  const [isPublic, setIsPublic] = useState(user?.isPublic ?? true);
  const [isLibraryPublic, setIsLibraryPublic] = useState(user?.isLibraryPublic ?? true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return null;
  }

  const toggleGenre = (key: string) => {
    setSelectedGenres(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (displayName.trim().length < 1) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide.');
      return;
    }
    setSaving(true);
    try {
      await userService.updateProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        country,
        avatarEmoji,
        favoriteGenres: Array.from(selectedGenres),
        isPublic,
        isLibraryPublic,
      });
      await refreshProfile();
      navigation.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  const currentCountry = COUNTRIES.find(c => c.code === country);

  return (
    <ScreenWrapper edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifier le profil</Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnLoading]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>
            {saving ? '...' : 'Sauvegarder'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Avatar ─────────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => setShowEmojiPicker(v => !v)}
            activeOpacity={0.8}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>{avatarEmoji}</Text>
            </View>
            <View style={styles.avatarOverlay}>
              <Text style={styles.avatarOverlayText}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarEditLabel}>Changer l'avatar</Text>

          {/* Emoji picker */}
          {showEmojiPicker && (
            <View style={styles.emojiPicker}>
              <Text style={styles.emojiPickerLabel}>Choisir un avatar :</Text>
              <View style={styles.emojiGrid}>
                {AVATAR_EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiItem, avatarEmoji === e && styles.emojiItemSelected]}
                    onPress={() => {
                      setAvatarEmoji(e);
                      setShowEmojiPicker(false);
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.emojiItemText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── Informations ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>

          {/* Nom d'affichage */}
          <View style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Nom d'affichage</Text>
              <Text style={styles.fieldCount}>{displayName.length}/30</Text>
            </View>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={t => setDisplayName(t.slice(0, 30))}
              maxLength={30}
              placeholderTextColor={colors.text30}
              placeholder="Ton nom"
            />
          </View>

          {/* Username (lecture seule) */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nom d'utilisateur</Text>
            <View style={styles.inputPrefix}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefixText}>@</Text>
              </View>
              <Text style={styles.inputReadOnly}>{user.username}</Text>
            </View>
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <Text style={styles.fieldCount}>{bio.length}/160</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputTextarea]}
              value={bio}
              onChangeText={t => setBio(t.slice(0, 160))}
              maxLength={160}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.text30}
              placeholder="Parle de toi..."
            />
          </View>

          {/* Pays */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Pays</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCountryPicker(v => !v)}
              activeOpacity={0.8}>
              <Text style={styles.inputText}>
                {currentCountry?.label ?? '🌍 Autre'}
              </Text>
              <Text style={styles.inputArrow}>▾</Text>
            </TouchableOpacity>
            {showCountryPicker && (
              <View style={styles.dropdown}>
                {COUNTRIES.map(c => (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.dropdownItem, country === c.code && styles.dropdownItemSelected]}
                    onPress={() => {
                      setCountry(c.code);
                      setShowCountryPicker(false);
                    }}
                    activeOpacity={0.7}>
                    <Text style={[styles.dropdownText, country === c.code && styles.dropdownTextSelected]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Genres préférés ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Genres préférés</Text>
          <View style={styles.chipsWrap}>
            {GENRES.map(g => {
              const sel = selectedGenres.has(g.key);
              return (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.chip, sel && styles.chipSelected]}
                  onPress={() => toggleGenre(g.key)}
                  activeOpacity={0.7}>
                  <Text style={[styles.chipText, sel && styles.chipTextSelected]}>
                    {g.emoji} {g.label}{sel ? ' ✓' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Confidentialité ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confidentialité</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Profil public</Text>
              <Text style={styles.toggleSub}>Tout le monde peut voir ton profil</Text>
            </View>
            <ToggleSwitch value={isPublic} onToggle={() => setIsPublic(v => !v)} />
          </View>

          <View style={[styles.toggleRow, styles.toggleRowBorder]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Bibliothèque visible</Text>
              <Text style={styles.toggleSub}>Partager ta liste de lecture</Text>
            </View>
            <ToggleSwitch value={isLibraryPublic} onToggle={() => setIsLibraryPublic(v => !v)} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Zone dangereuse ────────────────────────────────────── */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Zone dangereuse</Text>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() =>
              Alert.alert(
                'Supprimer le compte',
                'Cette action est irréversible. Toutes tes données seront perdues.',
                [
                  {text: 'Annuler', style: 'cancel'},
                  {text: 'Supprimer', style: 'destructive', onPress: () => {}},
                ],
              )
            }
            activeOpacity={0.8}>
            <Text style={styles.dangerBtnText}>Supprimer le compte</Text>
          </TouchableOpacity>
        </View>

        <View style={{height: 60}} />
      </ScrollView>
    </ScreenWrapper>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bgBase},

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
    paddingBottom: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  backIcon: {fontSize: 18, color: colors.text100},
  headerTitle: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.text100,
  },
  saveBtn: {
    backgroundColor: colors.orange,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s4,
    paddingVertical: 8,
  },
  saveBtnLoading: {opacity: 0.6},
  saveBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.s6,
    paddingHorizontal: spacing.s4,
  },
  avatarWrap: {position: 'relative'},
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.orangeDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bgBase,
  },
  avatarEmoji: {fontSize: 44},
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: 48,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  avatarOverlayText: {fontSize: 22},
  avatarEditLabel: {
    marginTop: spacing.s3,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.orange,
    fontWeight: '600',
  },

  // Emoji picker
  emojiPicker: {
    marginTop: spacing.s4,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.s4,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  emojiPickerLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    marginBottom: spacing.s2,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  emojiItem: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  emojiItemSelected: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderWidth: 2,
    borderColor: colors.orange,
  },
  emojiItemText: {fontSize: 26},

  // Sections
  section: {
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s2,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text60,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.s5,
    marginBottom: spacing.s3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.s2,
  },

  // Form fields
  field: {marginBottom: spacing.s4},
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.s2,
  },
  fieldLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text60,
  },
  fieldCount: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.text30,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s3,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text100,
  },
  inputText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text100,
  },
  inputArrow: {
    fontSize: 14,
    color: colors.text30,
  },
  inputTextarea: {
    height: 80,
    textAlignVertical: 'top',
    alignItems: 'flex-start',
  },
  inputPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  prefixBox: {
    paddingHorizontal: spacing.s3,
    paddingVertical: 12,
    backgroundColor: colors.bgCard,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  prefixText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text30,
  },
  inputReadOnly: {
    flex: 1,
    paddingHorizontal: spacing.s3,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
  },

  // Dropdown pays
  dropdown: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: spacing.s3,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {backgroundColor: 'rgba(255,107,53,0.1)'},
  dropdownText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
  },
  dropdownTextSelected: {color: colors.orange, fontWeight: '600'},

  // Genres chips
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  chip: {
    paddingHorizontal: spacing.s3,
    paddingVertical: 7,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderColor: colors.orange,
  },
  chipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.text60,
  },
  chipTextSelected: {color: colors.orange},

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s3,
  },
  toggleRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleInfo: {flex: 1, marginRight: spacing.s4},
  toggleLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text100,
  },
  toggleSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text60,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.text60,
  },
  toggleThumbActive: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },

  // Danger
  dangerZone: {
    margin: spacing.s4,
    padding: spacing.s4,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  dangerTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
    marginBottom: spacing.s3,
  },
  dangerBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: radius.md,
    paddingVertical: spacing.s3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  dangerBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
});

export default EditProfileScreen;
