import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors} from '../../constants/theme';

const GenreSelectionScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Sélection genres — À implémenter</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bgBase, alignItems: 'center', justifyContent: 'center'},
  text: {color: colors.text60, fontSize: 14},
});

export default GenreSelectionScreen;
