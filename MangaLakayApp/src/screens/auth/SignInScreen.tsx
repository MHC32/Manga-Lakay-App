// src/screens/auth/SignInScreen.tsx
import React, {useState, useRef, useCallback} from 'react';
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
import {colors, fonts, spacing, radius} from '../../constants/theme';
import {AuthStackParamList} from '../../types/navigation.types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type Props = StackScreenProps<AuthStackParamList, 'SignIn'>;

const SignInScreen = ({navigation}: Props) => {
  const {setUser} = useAuthStore();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Animation du banner d'erreur
  const errorHeight  = useRef(new Animated.Value(0)).current;
  const errorOpacity = useRef(new Animated.Value(0)).current;

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    Animated.parallel([
      Animated.timing(errorHeight,  {toValue: 48, duration: 250, useNativeDriver: false}),
      Animated.timing(errorOpacity, {toValue: 1,  duration: 250, useNativeDriver: false}),
    ]).start();

    // Disparaît automatiquement après 4s
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(errorHeight,  {toValue: 0, duration: 250, useNativeDriver: false}),
        Animated.timing(errorOpacity, {toValue: 0, duration: 250, useNativeDriver: false}),
      ]).start();
    }, 4000);
  }, [errorHeight, errorOpacity]);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      showError('Entre ton email et mot de passe.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await authService.signInWithEmail(email.trim(), password);
      const profile = await userService.getProfile(result.user.uid);
      if (__DEV__) { console.log('[SignIn] Profil Firestore:', profile ? 'trouvé' : 'introuvable'); }
      if (profile) {
        setUser(profile);
        await userService.updateLastActive(result.user.uid);
        if (__DEV__) { console.log('[SignIn] Connexion réussie — user:', profile.username); }
        navigation.getParent()?.goBack();
      } else {
        showError('Profil introuvable. Contacte le support.');
      }
    } catch (e: any) {
      console.error('[SignIn] Erreur:', e?.code, e?.message);
      showError('Email ou mot de passe incorrect. Réessaie.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    if (__DEV__) { console.log('[Google] Lancement Google Sign-In...'); }
    try {
      const result = await authService.signInWithGoogle();
      const uid = result.user.uid;
      const existingProfile = await userService.getProfile(uid);
      const isNewUser = !existingProfile;
      if (__DEV__) { console.log('[Google] Profil Firestore:', existingProfile ? 'trouvé' : 'introuvable (nouvel utilisateur)'); }
      let profile = existingProfile;
      if (!profile) {
        const userEmail = result.user.email ?? '';
        const rawName = result.user.displayName ?? 'otaku';
        const username = rawName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'user_' + uid.slice(0, 8);
        if (__DEV__) { console.log('[Google] Création profil — username:', username); }
        await userService.createProfile(uid, userEmail, username);
        profile = await userService.getProfile(uid);
        if (__DEV__) { console.log('[Google] Profil créé:', profile ? 'OK' : 'ÉCHEC'); }
      }
      if (profile) {
        setUser(profile);
        await userService.updateLastActive(uid);
        if (__DEV__) { console.log('[Google] Connexion réussie — user:', profile.username, '| nouvel utilisateur:', isNewUser); }
        if (isNewUser) {
          navigation.navigate('GenreSelection', {uid});
        } else {
          navigation.getParent()?.goBack();
        }
      } else {
        showError('Profil introuvable après création. Réessaie.');
      }
    } catch (e: any) {
      console.error('[Google] Erreur — code:', e?.code, '| message:', e?.message);
      if (e?.code !== 'SIGN_IN_CANCELLED') {
        showError('Connexion Google impossible. Réessaie.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showError('Entre ton email d\'abord pour réinitialiser.');
      return;
    }
    try {
      await authService.sendPasswordReset(email.trim());
      showError('Email de réinitialisation envoyé. Vérifie ta boîte.');
    } catch {
      showError('Impossible d\'envoyer l\'email. Réessaie.');
    }
  };

  return (
    <ScreenWrapper edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Flèche retour */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        {/* Logo + titres */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            <Text style={{color: colors.orange}}>Manga</Text>
            <Text style={{color: colors.teal}}>Lakay</Text>
          </Text>
          <Text style={styles.title}>Bon retou</Text>
          <Text style={styles.subtitle}>Bienvenue lakay ou encore</Text>
        </View>

        {/* Banner erreur animé */}
        <Animated.View
          style={[
            styles.errorBanner,
            {height: errorHeight, opacity: errorOpacity},
          ]}>
          <Text style={styles.errorBannerText} numberOfLines={1}>
            ⚠️ {errorMsg}
          </Text>
        </Animated.View>

        <View style={styles.form}>
          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Adresse email</Text>
            <TextInput
              style={styles.input}
              placeholder="ton@email.com"
              placeholderTextColor={colors.text30}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Mot de passe */}
          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                placeholder="••••••••"
                placeholderTextColor={colors.text30}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
                <Text style={styles.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
          </View>

          {/* Bouton connexion */}
          <TouchableOpacity
            style={[styles.btnPrimary, isLoading ? {opacity: 0.6} : null]}
            onPress={handleSignIn}
            disabled={isLoading}>
            <Text style={styles.btnPrimaryText}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
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

          {/* Liens bas */}
          <TouchableOpacity
            style={styles.signUpLink}
            onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signUpText}>
              Pas encore de compte ?{' '}
              <Text style={styles.signUpAccent}>S'inscrire</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestLink}
            onPress={() => navigation.getParent()?.goBack()}>
            <Text style={styles.guestText}>Continuer sans compte →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
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

  // Back
  backBtn: {paddingTop: spacing.s3, paddingBottom: spacing.s2},
  backArrow: {fontSize: 22, color: colors.text60},

  // Header
  header: {
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
    overflow: 'hidden',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.s4,
    justifyContent: 'center',
    marginBottom: spacing.s3,
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
  forgotRow: {alignSelf: 'flex-end', marginTop: 4},
  forgotText: {fontSize: 13, color: colors.text60},

  // Bouton
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
  googleLogo: {fontSize: 16, fontWeight: '900', color: '#4285F4'},
  btnGoogleText: {color: colors.text100, fontWeight: '600', fontSize: 14},

  // Liens
  signUpLink: {alignItems: 'center', padding: spacing.s2},
  signUpText: {fontSize: 14, color: colors.text60},
  signUpAccent: {color: colors.orange, fontWeight: '700'},
  guestLink: {alignItems: 'center', paddingTop: spacing.s1},
  guestText: {fontSize: 13, color: colors.text30},
});

export default SignInScreen;
