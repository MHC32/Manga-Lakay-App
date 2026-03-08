// src/app/navigation/RootNavigator.tsx
import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {getAuth, onAuthStateChanged} from '@react-native-firebase/auth';
import {useAuthStore} from '../../stores/auth.store';
import {useLibraryStore} from '../../stores/library.store';
import {userService} from '../../services/firebase/user.service';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import SplashScreen from '../../screens/auth/SplashScreen';

type RootParamList = {
  App: undefined;
  Auth: undefined;
};

const Root = createStackNavigator<RootParamList>();

const RootNavigator = () => {
  const {setUser, setInitialized, isInitialized} = useAuthStore();
  const {subscribeToLibrary, unsubscribeFromLibrary} = useLibraryStore();
  // Splash affiché jusqu'à ce que Firebase ait résolu l'état auth
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async firebaseUser => {
      if (firebaseUser) {
        const profile = await userService.getProfile(firebaseUser.uid);
        setUser(profile);
        subscribeToLibrary(firebaseUser.uid);
      } else {
        setUser(null);
        unsubscribeFromLibrary();
      }
      setInitialized(true);
      // Petit délai pour que les animations du Splash finissent proprement
      setTimeout(() => setShowSplash(false), 400);
    });
    return unsubscribe;
  }, [setUser, setInitialized]);

  // Tant que Firebase n'a pas résolu (ou délai non écoulé), on montre le Splash
  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{headerShown: false}}>
        {/* L'app est toujours accessible — mode guest (BR-004) */}
        <Root.Screen name="App" component={AppNavigator} />
        {/* Auth est un stack modal par-dessus l'app */}
        <Root.Screen
          name="Auth"
          component={AuthNavigator}
          options={{presentation: 'modal'}}
        />
      </Root.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
