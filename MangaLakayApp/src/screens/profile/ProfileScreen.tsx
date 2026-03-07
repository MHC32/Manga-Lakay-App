import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../../constants/theme';

const ProfileScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Profil</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center'},
  text: {color: colors.text100, fontSize: 18, fontWeight: '700'},
});

export default ProfileScreen;
