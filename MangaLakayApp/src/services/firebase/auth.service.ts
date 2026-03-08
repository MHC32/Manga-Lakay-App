// src/services/firebase/auth.service.ts
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';
import {GoogleSignin} from '@react-native-google-signin/google-signin';

// Configurer Google Sign-In avec le Web Client ID Firebase
GoogleSignin.configure({
  webClientId: '115924221632-fpqctg6mdm4fds36vou1hf4n06n5ok62.apps.googleusercontent.com',
});

export const authService = {
  async signUpWithEmail(email: string, password: string) {
    return createUserWithEmailAndPassword(getAuth(), email, password);
  },

  async signInWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(getAuth(), email, password);
  },

  async signInWithGoogle() {
    if (__DEV__) { console.log('[authService] hasPlayServices...'); }
    await GoogleSignin.hasPlayServices();
    if (__DEV__) { console.log('[authService] Play Services OK — appel GoogleSignin.signIn()...'); }
    const signInResult = await GoogleSignin.signIn();
    const idToken = signInResult.data?.idToken ?? (signInResult as {idToken?: string}).idToken;
    if (__DEV__) { console.log('[authService] idToken présent:', !!idToken); }
    if (!idToken) {
      throw new Error('Google Sign-In: idToken manquant');
    }
    const googleCredential = GoogleAuthProvider.credential(idToken);
    if (__DEV__) { console.log('[authService] Credential créé — signInWithCredential...'); }
    return signInWithCredential(getAuth(), googleCredential);
  },

  async signOut() {
    await firebaseSignOut(getAuth());
    try {
      await GoogleSignin.signOut();
    } catch {
      // Google Sign-In peut ne pas être configuré — ignorer silencieusement
    }
  },

  getCurrentUser() {
    return getAuth().currentUser;
  },

  onAuthStateChanged(callback: (user: any) => void) {
    return onAuthStateChanged(getAuth(), callback);
  },

  async sendEmailVerification() {
    const user = getAuth().currentUser;
    if (user) {
      await sendEmailVerification(user);
    }
  },

  async sendPasswordReset(email: string) {
    await sendPasswordResetEmail(getAuth(), email);
  },
};
