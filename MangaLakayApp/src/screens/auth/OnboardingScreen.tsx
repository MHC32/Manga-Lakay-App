// src/screens/auth/OnboardingScreen.tsx
import React, {useRef, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  ViewToken,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {colors, fonts, spacing, radius} from '../../constants/theme';
import {AuthStackParamList} from '../../types/navigation.types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

const {width: SCREEN_W} = Dimensions.get('window');

// ─── Slides data ──────────────────────────────────────────────────────────────

interface Slide {
  id: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  illustration: React.ReactNode;
  titleA: string;
  titleB: string;
  titleBColor: string;
  desc: string;
  bgColor: string;
}

const IllusSlide1 = () => (
  <View style={illus.s1Wrap}>
    <Text style={illus.s1Emoji}>🌺</Text>
  </View>
);

const IllusSlide2 = () => (
  <View style={illus.s2Grid}>
    {[
      {emoji: '⚔️', bg: ['#1a0533', '#3d1a6e']},
      {emoji: '🌊', bg: ['#0d3320', '#1a6e40']},
      {emoji: '🔥', bg: ['#33170d', '#6e3a1a']},
      {emoji: '💀', bg: ['#1a1033', '#3a2266']},
      {emoji: '🌸', bg: ['#0d2233', '#1a4a6e']},
      {emoji: '⚡', bg: ['#2a1a0d', '#6e4a1a']},
    ].map((c, i) => (
      <View
        key={i}
        style={[
          illus.miniCard,
          {backgroundColor: c.bg[1]},
        ]}>
        <Text style={illus.miniEmoji}>{c.emoji}</Text>
      </View>
    ))}
  </View>
);

const IllusSlide3 = () => (
  <View style={illus.s3Wrap}>
    <View style={illus.avatarsRow}>
      {[
        {initials: 'RK', bg: colors.orange},
        {initials: 'NM', bg: colors.teal},
        {initials: 'JB', bg: colors.mango},
      ].map((av, i) => (
        <View key={i} style={[illus.avatar, {backgroundColor: av.bg, left: i * 42}]}>
          <Text style={illus.avatarText}>{av.initials}</Text>
        </View>
      ))}
      <View style={[illus.avatar, {backgroundColor: '#1F2937', left: 3 * 42, borderWidth: 2, borderColor: colors.border}]}>
        <Text style={[illus.avatarText, {color: colors.text60, fontSize: 11}]}>+847</Text>
      </View>
    </View>
    <Text style={illus.communityTitle}>Ta kominote otaku</Text>
    <Text style={illus.communitySub}>847 otakus haïtiens déjà là</Text>
  </View>
);

const SLIDES: Slide[] = [
  {
    id: '1',
    tag: 'Bienvenue',
    tagColor: colors.orange,
    tagBg: 'rgba(255,107,53,0.15)',
    illustration: <IllusSlide1 />,
    titleA: 'Bienvenue\n',
    titleB: 'lakay ou !',
    titleBColor: colors.orange,
    desc: 'La première app manga faite par des otakus haïtiens, pour les otakus haïtiens. Partout dans le monde.',
    bgColor: 'rgba(255,107,53,0.06)',
  },
  {
    id: '2',
    tag: 'Catalogue',
    tagColor: colors.teal,
    tagBg: 'rgba(0,212,170,0.12)',
    illustration: <IllusSlide2 />,
    titleA: 'Des milliers\nde ',
    titleB: 'mangas',
    titleBColor: colors.teal,
    desc: 'Explore un catalogue immense. Cherche, filtre, lis — tout en français. Demon Slayer, One Piece, ou les pépites cachées.',
    bgColor: 'rgba(0,212,170,0.05)',
  },
  {
    id: '3',
    tag: 'Communauté',
    tagColor: colors.mango,
    tagBg: 'rgba(255,209,102,0.12)',
    illustration: <IllusSlide3 />,
    titleA: 'Rejoins la\n',
    titleB: 'kominote',
    titleBColor: colors.teal,
    desc: 'Vois ce que les otakus haïtiens lisent. Note tes mangas. Grimpe dans le Tablo Dònen.',
    bgColor: 'rgba(255,209,102,0.04)',
  },
];

// ─── Dot animé ────────────────────────────────────────────────────────────────

const Dot = ({active}: {active: boolean}) => {
  const width = useRef(new Animated.Value(active ? 24 : 8)).current;

  React.useEffect(() => {
    Animated.timing(width, {
      toValue: active ? 24 : 8,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [active, width]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          backgroundColor: active ? colors.orange : colors.border,
        },
      ]}
    />
  );
};

// ─── OnboardingScreen ──────────────────────────────────────────────────────────

type Props = StackScreenProps<AuthStackParamList, 'Onboarding'>;

const OnboardingScreen = ({navigation}: Props) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      if (viewableItems[0]) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    },
  ).current;

  const viewabilityConfig = useRef({viewAreaCoveragePercentThreshold: 50}).current;

  const goToSlide = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({index, animated: true});
  }, []);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      goToSlide(activeIndex + 1);
    }
  }, [activeIndex, goToSlide]);

  const renderSlide = useCallback(
    ({item, index}: {item: Slide; index: number}) => {
      const isLast = index === SLIDES.length - 1;
      return (
        <View style={[styles.slide, {backgroundColor: item.bgColor}]}>
          {/* Illustration */}
          <View style={styles.illustrationArea}>{item.illustration}</View>

          {/* Contenu bas */}
          <View style={styles.slideContent}>
            {/* Tag */}
            <View style={[styles.tag, {backgroundColor: item.tagBg}]}>
              <Text style={[styles.tagText, {color: item.tagColor}]}>{item.tag}</Text>
            </View>

            {/* Titre */}
            <Text style={styles.title}>
              <Text style={styles.titleDefault}>{item.titleA}</Text>
              <Text style={[styles.titleAccent, {color: item.titleBColor}]}>{item.titleB}</Text>
            </Text>

            {/* Description */}
            <Text style={styles.desc}>{item.desc}</Text>

            {/* Dots */}
            <View style={styles.dotsRow}>
              {SLIDES.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
                  <Dot active={i === activeIndex} />
                </TouchableOpacity>
              ))}
            </View>

            {/* CTA */}
            {isLast ? (
              <View style={styles.ctaGroup}>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => navigation.navigate('SignUp')}>
                  <Text style={styles.btnPrimaryText}>Créer mon compte — gratis</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnOutline}
                  onPress={() => navigation.navigate('SignIn')}>
                  <Text style={styles.btnOutlineText}>J'ai déjà un compte</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.guestLink}
                  onPress={() => navigation.getParent()?.goBack()}>
                  <Text style={styles.guestText}>Continuer sans compte</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.btnNext} onPress={handleNext}>
                <Text style={styles.btnNextText}>Suivant</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    },
    [activeIndex, goToSlide, handleNext, navigation],
  );

  // Barre de progression (0–100%)
  const progressPct = ((activeIndex + 1) / SLIDES.length) * 100;

  return (
    <ScreenWrapper edges={['top']}>
      {/* Barre de progression top */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, {width: `${progressPct}%`}]} />
      </View>

      {/* Top nav : logo + Passer */}
      <View style={styles.topNav}>
        <Text style={styles.logo}>
          <Text style={{color: colors.orange}}>Manga</Text>
          <Text style={{color: colors.teal}}>Lakay</Text>
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderSlide}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
      />
    </ScreenWrapper>
  );
};

// ─── Styles illustrations ──────────────────────────────────────────────────────

const illus = StyleSheet.create({
  s1Wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  s1Emoji: {
    fontSize: 120,
  },
  s2Grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 264,
    gap: 8,
    alignSelf: 'center',
  },
  miniCard: {
    width: 80,
    height: 120,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniEmoji: {fontSize: 28},
  s3Wrap: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  avatarsRow: {
    height: 64,
    width: 210,
    position: 'relative',
  },
  avatar: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  communityTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text100,
    textAlign: 'center',
    marginTop: 8,
  },
  communitySub: {
    fontSize: 12,
    color: colors.teal,
    fontWeight: '600',
    textAlign: 'center',
  },
});

// ─── Styles principaux ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.border,
    zIndex: 10,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.orange,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  topNav: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.s5,
    zIndex: 20,
  },
  logo: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    fontWeight: '900',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text60,
  },

  // Slide
  slide: {
    width: SCREEN_W,
    flex: 1,
  },
  illustrationArea: {
    height: '58%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  slideContent: {
    paddingHorizontal: spacing.s5,
    paddingBottom: spacing.s8,
    alignItems: 'center',
  },

  // Tag
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.s3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Titre
  title: {
    textAlign: 'center',
    marginBottom: spacing.s3,
  },
  titleDefault: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    fontWeight: '900',
    color: colors.text100,
    lineHeight: 38,
  },
  titleAccent: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },

  // Description
  desc: {
    fontSize: 15,
    color: colors.text60,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing.s5,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.s5,
  },
  dot: {
    height: 8,
    borderRadius: radius.full,
  },

  // Boutons
  btnPrimary: {
    backgroundColor: colors.orange,
    paddingVertical: 16,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.s3,
  },
  btnPrimaryText: {color: '#fff', fontWeight: '700', fontSize: 15},
  btnOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.s2,
  },
  btnOutlineText: {color: colors.text100, fontWeight: '600', fontSize: 15},
  btnNext: {
    backgroundColor: colors.orange,
    paddingVertical: 16,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center',
  },
  btnNextText: {color: '#fff', fontWeight: '700', fontSize: 15},
  ctaGroup: {width: '100%'},
  guestLink: {alignItems: 'center', paddingTop: spacing.s2},
  guestText: {fontSize: 13, color: colors.text30},
});

export default OnboardingScreen;
