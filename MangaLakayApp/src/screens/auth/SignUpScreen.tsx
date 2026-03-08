// src/screens/auth/SignUpScreen.tsx
import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {authService} from '../../services/firebase/auth.service';
import {userService} from '../../services/firebase/user.service';
import {useAuthStore} from '../../stores/auth.store';
import {sanitizeUsername} from '../../utils/sanitize';
import {colors, fonts, spacing, radius} from '../../constants/theme';
import {AuthStackParamList} from '../../types/navigation.types';
import {MIN_USERNAME_LENGTH, MAX_USERNAME_LENGTH} from '../../constants/config';

type Props = StackScreenProps<AuthStackParamList, 'SignUp'>;

// ─── Force du mot de passe ────────────────────────────────────────────────────

type Strength = 0 | 1 | 2 | 3 | 4;

const getStrength = (pw: string): Strength => {
  if (pw.length === 0) return 0;
  if (pw.length < 6)   return 1;
  if (pw.length < 8)   return 2;
  if (pw.length < 12)  return 3;
  return 4;
};

const STRENGTH_LABELS = ['', 'Trop court', 'Moyen', 'Bien', 'Fort'];
const STRENGTH_COLORS = [
  'transparent',
  colors.error,
  '#F59E0B',
  colors.teal,
  colors.success,
];

// ─── SignUpScreen ─────────────────────────────────────────────────────────────

const SignUpScreen = ({navigation}: Props) => {
  const {setUser} = useAuthStore();
  const [email, setEmail]         = useState('');
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const strength  = getStrength(password);
  const strengthW = useRef(new Animated.Value(0)).current;

  const animateStrength = (s: Strength) => {
    Animated.timing(strengthW, {
      toValue: s / 4,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handlePasswordChange = (v: string) => {
    setPassword(v);
    animateStrength(getStrength(v));
  };

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!email.includes('@')) {
      newErrors.email = 'Email invalide.';
    }
    if (password.length < 6) {
      newErrors.password = 'Mot de passe: 6 caractères minimum.';
    }
    if (password !== confirm) {
      newErrors.confirm = 'Les mots de passe ne correspondent pas.';
    }
    if (!termsAccepted) {
      newErrors.terms = 'Accepte les conditions pour continuer.';
    }

    const clean = sanitizeUsername(username);
    if (clean.length < MIN_USERNAME_LENGTH || clean.length > MAX_USERNAME_LENGTH) {
      newErrors.username = `Pseudo: ${MIN_USERNAME_LENGTH}–${MAX_USERNAME_LENGTH} caractères (lettres, chiffres, _ -)`;
    } else {
      const available = await userService.isUsernameAvailable(clean);
      if (!available) {
        newErrors.username = 'Ce pseudo est déjà pris.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    if (__DEV__) { console.log('[Google/SignUp] Lancement Google Sign-In...'); }
    try {
      const result = await authService.signInWithGoogle();
      const uid = result.user.uid;
      const existingProfile = await userService.getProfile(uid);
      const isNewUser = !existingProfile;
      if (__DEV__) { console.log('[Google/SignUp] Profil Firestore:', existingProfile ? 'trouvé' : 'introuvable (nouvel utilisateur)'); }
      let profile = existingProfile;
      if (!profile) {
        const userEmail = result.user.email ?? '';
        const rawName = result.user.displayName ?? 'otaku';
        const username = rawName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user_' + uid.slice(0, 8);
        if (__DEV__) { console.log('[Google/SignUp] Création profil — username:', username); }
        await userService.createProfile(uid, userEmail, username);
        profile = await userService.getProfile(uid);
        if (__DEV__) { console.log('[Google/SignUp] Profil créé:', profile ? 'OK' : 'ÉCHEC'); }
      }
      if (profile) {
        setUser(profile);
        await userService.updateLastActive(uid);
        if (__DEV__) { console.log('[Google/SignUp] Connexion réussie — user:', profile.username, '| nouvel utilisateur:', isNewUser); }
        if (isNewUser) {
          navigation.navigate('GenreSelection', {uid});
        } else {
          navigation.getParent()?.goBack();
        }
      } else {
        setErrors({global: 'Profil introuvable après création. Réessaie.'});
      }
    } catch (e: any) {
      console.error('[Google/SignUp] Erreur — code:', e?.code, '| message:', e?.message);
      if (e?.code !== 'SIGN_IN_CANCELLED') {
        setErrors({global: 'Connexion Google impossible. Réessaie.'});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    const valid = await validate();
    if (!valid) {
      setIsLoading(false);
      return;
    }
    try {
      const result = await authService.signUpWithEmail(email, password);
      const uid = result.user.uid;
      const cleanUsername = sanitizeUsername(username);
      await userService.createProfile(uid, email, cleanUsername);
      await authService.sendEmailVerification();
      navigation.navigate('GenreSelection', {uid});
    } catch (e: unknown) {
      setErrors({global: e instanceof Error ? e.message : 'Erreur inconnue'});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Text style={{color: colors.orange}}>Manga</Text>
            <Text style={{color: colors.teal}}>Lakay</Text>
          </Text>
          <Text style={styles.title}>Konte nèf</Text>
          <Text style={styles.subtitle}>Rejoins la communauté otaku haïtienne</Text>
        </View>

        {/* Erreur globale */}
        {errors.global ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errors.global}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Adresse email</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="ton@email.com"
              placeholderTextColor={colors.text30}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          {/* Pseudo */}
          <View style={styles.field}>
            <Text style={styles.label}>Pseudo</Text>
            <TextInput
              style={[styles.input, errors.username ? styles.inputError : null]}
              placeholder="ex: otaku_lakay"
              placeholderTextColor={colors.text30}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.username ? <Text style={styles.fieldError}>{errors.username}</Text> : null}
          </View>

          {/* Mot de passe */}
          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex, errors.password ? styles.inputError : null]}
                placeholder="8 caractères minimum"
                placeholderTextColor={colors.text30}
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
                <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {/* Barre force */}
            {password.length > 0 ? (
              <View>
                <View style={styles.strengthTrack}>
                  <Animated.View
                    style={[
                      styles.strengthFill,
                      {
                        width: strengthW.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: STRENGTH_COLORS[strength],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, {color: STRENGTH_COLORS[strength]}]}>
                  {STRENGTH_LABELS[strength]}
                </Text>
              </View>
            ) : null}
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
          </View>

          {/* Confirmer mot de passe */}
          <View style={styles.field}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex, errors.confirm ? styles.inputError : null]}
                placeholder="Répète ton mot de passe"
                placeholderTextColor={colors.text30}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirm ? <Text style={styles.fieldError}>{errors.confirm}</Text> : null}
          </View>

          {/* CGU */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setTerms(v => !v)}>
            <View style={[styles.checkbox, termsAccepted ? styles.checkboxChecked : null]}>
              {termsAccepted ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.termsText}>
              J'accepte les{' '}
              <Text style={styles.termsLink}>Conditions d'utilisation</Text>
              {' '}et la{' '}
              <Text style={styles.termsLink}>Politique de confidentialité</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms ? <Text style={styles.fieldError}>{errors.terms}</Text> : null}

          {/* Bouton créer */}
          <TouchableOpacity
            style={[styles.btnPrimary, isLoading ? {opacity: 0.6} : null]}
            onPress={handleSignUp}
            disabled={isLoading}>
            <Text style={styles.btnPrimaryText}>
              {isLoading ? 'Création...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>ou continuer avec</Text>
            <View style={styles.divLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[styles.btnGoogle, isLoading && {opacity: 0.6}]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}>
            <Text style={styles.googleLogo}>G</Text>
            <Text style={styles.btnGoogleText}>Continuer avec Google</Text>
          </TouchableOpacity>

          {/* Lien connexion */}
          <TouchableOpacity
            style={styles.signInLink}
            onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.signInText}>
              Déjà un compte ?{' '}
              <Text style={styles.signInAccent}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.s5,
    paddingBottom: spacing.s8,
  },

  // Header
  header: {
    paddingTop: spacing.s7,
    paddingBottom: spacing.s7,
    alignItems: 'center',
  },
  logo: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.s5,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    fontWeight: '900',
    color: colors.text100,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text60,
  },

  // Error banner
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: radius.md,
    padding: spacing.s3,
    marginBottom: spacing.s4,
  },
  errorBannerText: {fontSize: 13, color: colors.error},

  // Form
  form: {gap: spacing.s4},
  field: {gap: 6},
  label: {color: colors.text60, fontSize: 13, fontWeight: '600'},
  input: {
    backgroundColor: colors.bgElevated,
    color: colors.text100,
    fontSize: 15,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputError: {borderColor: colors.error},
  inputRow: {flexDirection: 'row', alignItems: 'center'},
  inputFlex: {flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0},
  eyeBtn: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: colors.border,
    height: 48,
    paddingHorizontal: spacing.s3,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {fontSize: 16},
  fieldError: {color: colors.error, fontSize: 12},

  // Barre force
  strengthTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: 6,
  },
  strengthFill: {
    height: 4,
    borderRadius: radius.full,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },

  // CGU
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s3,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.bgElevated,
  },
  checkboxChecked: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  checkmark: {color: '#fff', fontSize: 12, fontWeight: '900'},
  termsText: {flex: 1, fontSize: 13, color: colors.text60, lineHeight: 20},
  termsLink: {color: colors.orange},

  // Boutons
  btnPrimary: {
    backgroundColor: colors.orange,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.s2,
  },
  btnPrimaryText: {color: '#fff', fontWeight: '700', fontSize: 15},

  // Divider
  divider: {flexDirection: 'row', alignItems: 'center', gap: spacing.s3},
  divLine: {flex: 1, height: 1, backgroundColor: colors.border},
  divText: {fontSize: 12, color: colors.text30, fontWeight: '600'},

  // Google
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s3,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
  },
  googleLogo: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4285F4',
  },
  btnGoogleText: {color: colors.text100, fontWeight: '600', fontSize: 14},

  // Lien
  signInLink: {alignItems: 'center', padding: spacing.s2},
  signInText: {fontSize: 14, color: colors.text60},
  signInAccent: {color: colors.orange, fontWeight: '700'},
});

export default SignUpScreen;
