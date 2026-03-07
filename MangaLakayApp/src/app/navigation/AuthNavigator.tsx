// src/app/navigation/AuthNavigator.tsx
import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {AuthStackParamList} from '../../types/navigation.types';
import SplashScreen from '../../screens/auth/SplashScreen';
import OnboardingScreen from '../../screens/auth/OnboardingScreen';
import SignUpScreen from '../../screens/auth/SignUpScreen';
import SignInScreen from '../../screens/auth/SignInScreen';
import GenreSelectionScreen from '../../screens/auth/GenreSelectionScreen';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => (
  <Stack.Navigator
    initialRouteName="Onboarding"
    screenOptions={{headerShown: false}}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="GenreSelection" component={GenreSelectionScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
