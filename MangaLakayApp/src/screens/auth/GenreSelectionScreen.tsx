// src/screens/auth/GenreSelectionScreen.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {userService} from '../../services/firebase/user.service';
import {useAuthStore} from '../../stores/auth.store';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import {AuthStackParamList} from '../../types/navigation.types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type Props = StackScreenProps<AuthStackParamList, 'GenreSelection'>;

// ─── Données genres (US-003 : 12 genres avec icônes) ─────────────────────────

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

// ─── Carte genre ─────────────────────────────────────────────────────────────

interface GenreCardProps {
  genre: typeof GENRES[number];
  selected: boolean;
  onToggle: () => void;
}

const GenreCard = ({genre, selected, onToggle}: GenreCardProps) => (
  <TouchableOpacity
    style={[styles.genreCard, selected && styles.genreCardSelected]}
    onPress={onToggle}
    activeOpacity={0.7}>
    <Text style={[styles.genreEmoji, selected && styles.genreEmojiSelected]}>
      {genre.emoji}
    </Text>
    <Text style={[styles.genreName, selected && styles.genreNameSelected]}>
      {genre.label}
    </Text>
  </TouchableOpacity>
);

// ─── Écran ────────────────────────────────────────────────────────────────────

const GenreSelectionScreen = ({route, navigation}: Props) => {
  const {uid} = route.params;
  const {refreshProfile} = useAuthStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleGenre = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size === 0) {
      return;
    }
    setSaving(true);
    try {
      await userService.updateFavoriteGenres(uid, Array.from(selected));
      await refreshProfile();
      // Fermer le modal Auth → retour sur App (BR-004)
      navigation.getParent()?.goBack();
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder les genres. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.getParent()?.goBack();
  };

  const canContinue = selected.size > 0 && !saving;

  return (
    <ScreenWrapper edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.step}>Étape 1/1</Text>
          <Text style={styles.title}>
            {'Kisa ou\n'}
            <Text style={styles.titleAccent}>renmen</Text>
            {' 🎌'}
          </Text>
          <Text style={styles.subtitle}>
            Sélectionne tes genres pour personnaliser ton expérience MangaLakay.
          </Text>
        </View>

        {/* Compteur */}
        <Text style={styles.counter}>
          Sélectionné :{' '}
          <Text style={styles.counterValue}>{selected.size}</Text>
          /12
        </Text>

        {/* Grille 3 colonnes */}
        <View style={styles.grid}>
          {GENRES.map(genre => (
            <GenreCard
              key={genre.key}
              genre={genre}
              selected={selected.has(genre.key)}
              onToggle={() => toggleGenre(genre.key)}
            />
          ))}
        </View>

        {/* Espace pour le sticky bottom */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky bottom */}
      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.8}>
          <Text style={styles.continueBtnText}>
            {saving ? 'Sauvegarde...' : 'Continuer →'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.6}>
          <Text style={styles.skipText}>Passer cette étape</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  scrollContent: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
  },

  // Header
  header: {
    paddingTop: spacing.s6,
    paddingBottom: spacing.s6,
  },
  step: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.s2,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.text100,
    lineHeight: 36,
    marginBottom: 6,
  },
  titleAccent: {
    color: colors.orange,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text60,
    lineHeight: 22,
  },

  // Compteur
  counter: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    marginBottom: spacing.s4,
  },
  counterValue: {
    fontFamily: fonts.mono,
    color: colors.orange,
    fontWeight: '700',
  },

  // Grille
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s3,
  },
  genreCard: {
    width: '30.5%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.s3,
  },
  genreCardSelected: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderColor: colors.orange,
  },
  genreEmoji: {
    fontSize: 28,
  },
  genreEmojiSelected: {
    // La sélection est gérée par la carte — emoji reste identique
  },
  genreName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.text60,
    textAlign: 'center',
    lineHeight: 14,
  },
  genreNameSelected: {
    color: colors.orange,
  },

  bottomSpacer: {height: 120},

  // Sticky bottom
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s8,
    backgroundColor: colors.bgBase,
    gap: spacing.s3,
  },
  continueBtn: {
    backgroundColor: colors.orange,
    borderRadius: radius.xxl,
    paddingVertical: spacing.s4,
    alignItems: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  skipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    textAlign: 'center',
  },
});

export default GenreSelectionScreen;
