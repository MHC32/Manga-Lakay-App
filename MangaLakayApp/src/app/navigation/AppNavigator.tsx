// src/app/navigation/AppNavigator.tsx
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import {AppTabParamList} from '../../types/navigation.types';
import {colors} from '../../constants/theme';
import HomeScreen from '../../screens/home/HomeScreen';
import ExploreScreen from '../../screens/explore/ExploreScreen';
import SearchScreen from '../../screens/search/SearchScreen';
import RankingScreen from '../../screens/ranking/RankingScreen';
import ProfileScreen from '../../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();

// Icônes temporaires en texte (seront remplacées par des SVG en Phase 3)
const tabIcons: Record<string, string> = {
  Home: '🏠',
  Explore: '🧭',
  Search: '🔍',
  Ranking: '🏆',
  Profile: '👤',
};

const tabLabels: Record<string, string> = {
  Home: 'Accueil',
  Explore: 'Explorer',
  Search: 'Recherche',
  Ranking: 'Top',
  Profile: 'Profil',
};

const AppNavigator = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.bgCard,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: 64,
        paddingBottom: 8,
      },
      tabBarActiveTintColor: colors.orange,
      tabBarInactiveTintColor: colors.text60,
      tabBarIcon: ({color}) => (
        <Text style={{fontSize: 22, color}}>{tabIcons[route.name]}</Text>
      ),
      tabBarLabel: tabLabels[route.name],
    })}>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Explore" component={ExploreScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Ranking" component={RankingScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default AppNavigator;
