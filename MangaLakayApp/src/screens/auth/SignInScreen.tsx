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
import {useAuthStore} from '../../stores/auth.store';
import {Button} from '../../components/ui';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import {colors, spacing, radius} from '../../constants/theme';
import {AuthStackParamList} from '../../types/navigation.types';

type Props = StackScreenProps<AuthStackParamList, 'SignIn'>;

const SignInScreen = ({navigation}: Props) => {
  const {setUser} = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Entre ton email et mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.signInWithEmail(email.trim(), password);
      const profile = await userService.getProfile(result.user.uid);
      if (profile) {
        setUser(profile);
        await userService.updateLastActive(result.user.uid);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Email ou mot de passe incorrect.';
      Alert.alert('Connexion échouée', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email requis', 'Entre ton email pour réinitialiser le mot de passe.');
      return;
    }
    try {
      await authService.sendPasswordReset(email.trim());
      Alert.alert('Email envoyé', 'Vérifie ta boîte mail.');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'email.');
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>Bienvenue lakay</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
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

          <View style={styles.field}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.text30}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotLink}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <Button
            label="Se connecter"
            onPress={handleSignIn}
            loading={isLoading}
            fullWidth
            style={styles.btn}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            style={styles.link}>
            <Text style={styles.linkText}>
              Pas de compte ?{' '}
              <Text style={styles.linkAccent}>S'inscrire</Text>
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
  forgotLink: {alignSelf: 'flex-end'},
  forgotText: {color: colors.teal, fontSize: 13},
  btn: {marginTop: spacing.s2},
  link: {alignItems: 'center', padding: spacing.s2},
  linkText: {color: colors.text60, fontSize: 14},
  linkAccent: {color: colors.orange, fontWeight: '700'},
});

export default SignInScreen;
