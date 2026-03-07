// src/services/firebase/auth.service.ts
import auth from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

// Configurer Google Sign-In avec le Web Client ID Firebase
GoogleSignin.configure({
  webClientId: '115924221632-fpqctg6mdm4fds36vou1hf4n06n5ok62.apps.googleusercontent.com',
});

export const authService = {
  /**
   * Inscription avec email/password.
   */
  async signUpWithEmail(email: string, password: string) {
    return auth().createUserWithEmailAndPassword(email, password);
  },

  /**
   * Connexion avec email/password.
   */
  async signInWithEmail(email: string, password: string) {
    return auth().signInWithEmailAndPassword(email, password);
  },

  /**
   * Connexion avec Google OAuth.
   */
  async signInWithGoogle() {
    await GoogleSignin.hasPlayServices();
    const signInResult = await GoogleSignin.signIn();
    // Vérifier si idToken est disponible selon la version du SDK
    const idToken = signInResult.data?.idToken ?? (signInResult as {idToken?: string}).idToken;
    if (!idToken) {
      throw new Error('Google Sign-In: idToken manquant');
    }
    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    return auth().signInWithCredential(googleCredential);
  },

  /**
   * Déconnexion.
   */
  async signOut() {
    await auth().signOut();
    try {
      await GoogleSignin.signOut();
    } catch {
      // Google Sign-In peut ne pas être configuré — ignorer silencieusement
    }
  },

  /**
   * Obtenir l'utilisateur actuellement connecté.
   */
  getCurrentUser() {
    return auth().currentUser;
  },

  /**
   * Écouter les changements d'état d'authentification.
   */
  onAuthStateChanged(callback: (user: any) => void) {
    return auth().onAuthStateChanged(callback);
  },

  /**
   * Envoyer un email de vérification.
   */
  async sendEmailVerification() {
    const user = auth().currentUser;
    if (user) {
      await user.sendEmailVerification();
    }
  },

  /**
   * Réinitialisation du mot de passe.
   */
  async sendPasswordReset(email: string) {
    await auth().sendPasswordResetEmail(email);
  },
};
