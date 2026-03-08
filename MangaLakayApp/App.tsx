// App.tsx
import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StyleSheet, View, Text} from 'react-native';
import RootNavigator from './src/app/navigation/RootNavigator';
import {useNetworkStatus} from './src/hooks/useNetworkStatus';

const App = () => {
  const isOnline = useNetworkStatus();

  return (
    <GestureHandlerRootView style={styles.root}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            📡 Mode hors-ligne — contenu en cache
          </Text>
        </View>
      )}
      <RootNavigator />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  offlineBanner: {
    backgroundColor: '#F59E0B',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default App;
