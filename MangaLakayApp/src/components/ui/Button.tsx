// src/components/ui/Button.tsx
import React from 'react';
import {TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle} from 'react-native';
import {colors, radius, spacing} from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const Button = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  fullWidth = false,
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#fff' : colors.orange}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as keyof typeof styles]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.s4,
    paddingHorizontal: spacing.s6,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  // Variants
  primary: {
    backgroundColor: colors.orange,
  },
  secondary: {
    backgroundColor: colors.bgElevated,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  // Labels
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryLabel: {
    color: '#fff',
  },
  secondaryLabel: {
    color: colors.text100,
  },
  outlineLabel: {
    color: colors.orange,
  },
  ghostLabel: {
    color: colors.text60,
  },
});

export default Button;
