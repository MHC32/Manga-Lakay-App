// src/components/ui/EmptyState.tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, spacing} from '../../constants/theme';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

const EmptyState = ({title, subtitle, ctaLabel, onCta}: EmptyStateProps) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    {ctaLabel && onCta ? (
      <Button
        label={ctaLabel}
        onPress={onCta}
        variant="outline"
        style={styles.btn}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s8,
  },
  title: {
    color: colors.text100,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.text60,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.s6,
  },
  btn: {
    marginTop: spacing.s4,
  },
});

export default EmptyState;
