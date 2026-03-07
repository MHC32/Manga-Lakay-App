import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useAuthStore} from '../../stores/auth.store';
import {useLibraryStore} from '../../stores/library.store';
import {Button, EmptyState} from '../../components/ui';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import {colors, spacing, radius} from '../../constants/theme';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const {user, signOut} = useAuthStore();
  const {entries} = useLibraryStore();

  if (!user) {
    return (
      <ScreenWrapper>
        <EmptyState
          title="Pas de compte"
          subtitle="Kreye yon kont pou jwenn kominote a"
          ctaLabel="Se connecter"
          onCta={() => (navigation as any).navigate('Auth')}
        />
      </ScreenWrapper>
    );
  }

  const reading = entries.filter(e => e.status === 'reading').length;
  const completed = entries.filter(e => e.status === 'completed').length;
  const totalChapters = entries.reduce(
    (acc, e) => acc + e.chaptersRead.length,
    0,
  );

  return (
    <ScreenWrapper edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>{user.avatarEmoji ?? '🌺'}</Text>
          </View>
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{reading + completed}</Text>
            <Text style={styles.statLabel}>Mangas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalChapters}</Text>
            <Text style={styles.statLabel}>Chapitres</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completed}</Text>
            <Text style={styles.statLabel}>Terminés</Text>
          </View>
        </View>

        {/* Genres favoris */}
        {user.favoriteGenres.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genres favoris</Text>
            <View style={styles.genres}>
              {user.favoriteGenres.map(g => (
                <View key={g} style={styles.genreChip}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            label="Déconnexion"
            onPress={signOut}
            variant="outline"
            fullWidth
          />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: spacing.s6,
    paddingBottom: spacing.s5,
    paddingHorizontal: spacing.s4,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.orange,
    marginBottom: spacing.s3,
  },
  avatarEmoji: {fontSize: 36},
  displayName: {
    color: colors.text100,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  username: {color: colors.text60, fontSize: 14, marginBottom: spacing.s2},
  bio: {
    color: colors.text60,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.s4,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    paddingVertical: spacing.s4,
    marginBottom: spacing.s5,
  },
  statItem: {flex: 1, alignItems: 'center'},
  statValue: {
    color: colors.text100,
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {color: colors.text60, fontSize: 12, marginTop: 2},
  statDivider: {width: 1, backgroundColor: colors.border},
  section: {paddingHorizontal: spacing.s4, marginBottom: spacing.s5},
  sectionTitle: {
    color: colors.text100,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.s3,
  },
  genres: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2},
  genreChip: {
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s2,
    backgroundColor: `${colors.teal}20`,
    borderRadius: radius.xxl,
  },
  genreText: {color: colors.teal, fontSize: 12, fontWeight: '600'},
  actions: {paddingHorizontal: spacing.s4, marginTop: spacing.s4},
});

export default ProfileScreen;
