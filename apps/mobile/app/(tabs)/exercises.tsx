import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { ScreenHeader, ScreenContainer } from '../../components/layout';
import { Colors, Spacing } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';

export default function ExercisesScreen() {
  return (
    <>
      <ScreenHeader 
        title="Manage Exercises" 
        subtitle="Browse and manage your exercises"
      />
      <ScreenContainer>
        <Text style={styles.placeholder}>
          Exercise management screen will be implemented in Phase 7
        </Text>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
