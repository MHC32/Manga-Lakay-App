// src/components/ui/Badge.tsx
import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors, radius, spacing} from '../../constants/theme';

type BadgeVariant = 'orange' | 'teal' | 'mango' | 'success' | 'error' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const Badge = ({label, variant = 'default', style}: BadgeProps) => (
  <View style={[styles.base, styles[variant], style]}>
    <Text style={[styles.label, styles[`${variant}Label` as keyof typeof styles]]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.s2,
    paddingVertical: 2,
    borderRadius: radius.xxl,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Variants background
  orange: {backgroundColor: `${colors.orange}20`},
  teal: {backgroundColor: `${colors.teal}20`},
  mango: {backgroundColor: `${colors.mango}20`},
  success: {backgroundColor: `${colors.success}20`},
  error: {backgroundColor: `${colors.error}20`},
  default: {backgroundColor: colors.bgElevated},
  // Labels color
  orangeLabel: {color: colors.orange},
  tealLabel: {color: colors.teal},
  mangoLabel: {color: colors.mango},
  successLabel: {color: colors.success},
  errorLabel: {color: colors.error},
  defaultLabel: {color: colors.text60},
});

export default Badge;
