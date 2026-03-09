// src/components/layout/ScreenWrapper.tsx
import React from 'react';
import {StatusBar, StyleSheet, ViewStyle} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors} from '../../constants/theme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

const ScreenWrapper = ({children, style, edges = ['top', 'bottom']}: ScreenWrapperProps) => (
  <SafeAreaView style={[styles.container, style]} edges={edges}>
    <StatusBar barStyle="light-content" backgroundColor={colors.bgBase} translucent={false} />
    {children}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
});

export default ScreenWrapper;
