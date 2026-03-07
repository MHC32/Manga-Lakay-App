// src/app/navigation/RootNavigator.tsx
import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import auth from '@react-native-firebase/auth';
import {useAuthStore} from '../../stores/auth.store';
import {userService} from '../../services/firebase/user.service';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

type RootParamList = {
  Auth: undefined;
  App: undefined;
};

const Root = createStackNavigator<RootParamList>();

const RootNavigator = () => {
  const {user, setUser, setInitialized} = useAuthStore();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await userService.getProfile(firebaseUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setInitialized(true);
    });

    return unsubscribe;
  }, [setUser, setInitialized]);

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{headerShown: false}}>
        {user ? (
          <Root.Screen name="App" component={AppNavigator} />
        ) : (
          <Root.Screen name="Auth" component={AuthNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
