import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {authService} from '../../services/firebase/auth.service';
import {userService} from '../../services/firebase/user.service';
import {sanitizeUsername} from '../../utils/sanitize';
import {Button} from '../../components/ui';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import {colors, spacing, radius} from '../../constants/theme';
import {AuthStackParamList} from '../../types/navigation.types';
import {
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
} from '../../constants/config';

type Props = StackScreenProps<AuthStackParamList, 'SignUp'>;

const SignUpScreen = ({navigation}: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    // Email
    if (!email.includes('@')) {
      newErrors.email = 'Email invalide.';
    }

    // Password
    if (password.length < 6) {
      newErrors.password = 'Mot de passe: 6 caractères minimum.';
    }

    // Username — BR-005
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
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      Alert.alert('Erreur', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoins les otakus haïtiens</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Pseudo</Text>
            <TextInput
              style={[styles.input, errors.username && styles.inputError]}
              placeholder="ex: otaku_lakay"
              placeholderTextColor={colors.text30}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.username ? (
              <Text style={styles.errorText}>{errors.username}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="ton@email.com"
              placeholderTextColor={colors.text30}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="••••••••"
              placeholderTextColor={colors.text30}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          <Button
            label="Créer mon compte"
            onPress={handleSignUp}
            loading={isLoading}
            fullWidth
            style={styles.btn}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn')}
            style={styles.link}>
            <Text style={styles.linkText}>
              Déjà un compte ?{' '}
              <Text style={styles.linkAccent}>Se connecter</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.s5,
    justifyContent: 'center',
  },
  title: {
    color: colors.text100,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.text60,
    fontSize: 14,
    marginBottom: spacing.s6,
  },
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
  errorText: {color: colors.error, fontSize: 12},
  btn: {marginTop: spacing.s2},
  link: {alignItems: 'center', padding: spacing.s2},
  linkText: {color: colors.text60, fontSize: 14},
  linkAccent: {color: colors.orange, fontWeight: '700'},
});

export default SignUpScreen;
