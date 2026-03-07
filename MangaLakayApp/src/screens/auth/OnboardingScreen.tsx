import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {colors} from '../../constants/theme';
import {AuthStackParamList} from '../../types/navigation.types';

type Props = StackScreenProps<AuthStackParamList, 'Onboarding'>;

const OnboardingScreen = ({navigation}: Props) => (
  <View style={styles.container}>
    <Text style={styles.title}>Bienvenue lakay</Text>
    <Text style={styles.sub}>Le manga chez toi.</Text>
    <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('SignUp')}>
      <Text style={styles.btnText}>Créer un compte</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('SignIn')}>
      <Text style={styles.linkText}>J'ai déjà un compte</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center', padding: 24},
  title: {color: colors.text100, fontSize: 28, fontWeight: '900', marginBottom: 8},
  sub: {color: colors.text60, fontSize: 16, marginBottom: 48},
  btn: {backgroundColor: colors.orange, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 16},
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},
  link: {padding: 8},
  linkText: {color: colors.teal, fontSize: 14},
});

export default OnboardingScreen;
