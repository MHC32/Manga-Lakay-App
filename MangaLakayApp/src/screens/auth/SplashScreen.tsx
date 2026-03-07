import React from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {colors} from '../../constants/theme';

const SplashScreen = () => (
  <View style={styles.container}>
    <Text style={styles.logo}>MangaLakay</Text>
    <ActivityIndicator color={colors.orange} size="large" style={styles.loader} />
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center'},
  logo: {color: colors.text100, fontSize: 32, fontWeight: '900', marginBottom: 24},
  loader: {marginTop: 8},
});

export default SplashScreen;
