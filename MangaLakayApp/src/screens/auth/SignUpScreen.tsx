import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../../constants/theme';

const SignUpScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Inscription — À implémenter (Phase 5)</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center'},
  text: {color: colors.text60, fontSize: 14},
});

export default SignUpScreen;
