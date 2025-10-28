import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Dimensions, TextInput, Animated, Modal, FlatList } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, ScreenContainer } from '../../components/layout';
import { BackgroundRoot } from '../../components/BackgroundRoot';
import { Colors, Spacing, BorderRadius } from '../../constants/Theme';
import { TextStyles } from '../../constants/Typography';
import { useExerciseData } from '../../hooks/useExerciseData';
import { useAuth } from '../_contexts/auth-context';
import { UserExerciseList } from '../../components/manage-exercises/UserExerciseList';
import { GlobalExerciseList } from '../../components/manage-exercises/GlobalExerciseList';

interface ExercisesScreenProps {
  navigation?: any; // For future navigation to sub-views or modals
}

type TabType = 'my-exercises' | 'global-library';

export default function ExercisesScreen({ navigation }: ExercisesScreenProps) {
  const { supabase } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('my-exercises');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState<'muscle' | 'gym' | null>(null);
  const filterHeightAnim = useRef(new Animated.Value(0)).current;
  const tabSlideAnim = useRef(new Animated.Value(0)).current; // For tab transition animation
  const scrollViewRef = useRef<ScrollView>(null);

  // Use the new exercise data hook
  const {
    userExercises,
    globalExercises,
    availableMuscleGroups,
    userGyms,
    exerciseGymsMap,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    selectedGymFilter,
    setSelectedGymFilter,
    handleToggleFavorite,
    handleDeleteExercise,
    handleAddToWorkout,
    refreshExercises,
  } = useExerciseData({ supabase });

  console.log('Exercises screen - userGyms:', userGyms?.length || 0);

  console.log('Exercises screen - globalExercises:', globalExercises?.length || 0);
  console.log('Exercises screen - loading:', loading);
  console.log('Exercises screen - error:', error);

  const tabs: { key: TabType; title: string }[] = [
    { key: 'my-exercises', title: 'My Exercises' },
    { key: 'global-library', title: 'Global Library' },
  ];

  const handleTabPress = (tabKey: TabType) => {
    setActiveTab(tabKey);
    // Animate tab transition
    Animated.spring(tabSlideAnim, {
      toValue: tabKey === 'my-exercises' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleGestureStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;

      // Only handle horizontal swipes if not scrolling vertically
      if (Math.abs(translationX) > 50) { // Minimum swipe distance
        if (translationX > 0 && activeTab === 'global-library') {
          // Swipe right from Global Library -> My Exercises
          handleTabPress('my-exercises');
        } else if (translationX < 0 && activeTab === 'my-exercises') {
          // Swipe left from My Exercises -> Global Library
          handleTabPress('global-library');
        }
      }
    }
  };

  // Initialize animation on mount
  React.useEffect(() => {
    Animated.spring(tabSlideAnim, {
      toValue: activeTab === 'my-exercises' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);

  const handleFilterPress = useCallback(() => {
    setIsFilterExpanded(!isFilterExpanded);
    Animated.timing(filterHeightAnim, {
      toValue: isFilterExpanded ? 0 : 200, // Height for filter controls without apply button
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isFilterExpanded, filterHeightAnim]);

  const handleCloseFilters = useCallback(() => {
    // Close the filter panel
    setIsFilterExpanded(false);
    setDropdownVisible(null);
    Animated.timing(filterHeightAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [filterHeightAnim]);

  const handleDropdownToggle = useCallback((type: 'muscle' | 'gym') => {
    setDropdownVisible(dropdownVisible === type ? null : type);
  }, [dropdownVisible]);

  const handleDropdownSelect = useCallback((type: 'muscle' | 'gym', value: string) => {
    if (type === 'muscle') {
      setSelectedMuscleFilter(value);
    } else {
      setSelectedGymFilter(value);
    }
    setDropdownVisible(null);
    // Close filter panel after selection for better UX
    setIsFilterExpanded(false);
    Animated.timing(filterHeightAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [filterHeightAnim]);

  // Removed duplicate handleApplyFilters - now defined above

  // Removed gesture handler - will implement swipe differently

  return (
    <View style={styles.container}>
      <BackgroundRoot />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContainer}>
          <ScreenHeader
            title="My Exercises"
            subtitle="Browse and manage your exercises"
            style={{
              backgroundColor: 'transparent',
              borderBottomColor: 'transparent',
            }}
          />
          {/* Tab Navigation */}
          <View style={styles.tabNavigation}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.activeTab,
                ]}
                onPress={() => handleTabPress(tab.key)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.activeTabText,
                  ]}
                >
                  {tab.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search Bar & Filter */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={Colors.mutedForeground} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor={Colors.mutedForeground}
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
              <Ionicons name={isFilterExpanded ? "chevron-up" : "filter"} size={20} color={Colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Expandable Filter Controls */}
          <Animated.View style={[styles.filterControls, { height: filterHeightAnim.interpolate({
            inputRange: [0, 200],
            outputRange: [0, 200] // Reduced height to eliminate bottom gap
          }), maxHeight: 200 }]}>
            <View style={styles.filterControlsContent}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Muscle Group:</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => handleDropdownToggle('muscle')}
                >
                  <Text style={styles.dropdownButtonText}>
                    {selectedMuscleFilter === 'all' ? 'All' :
                     selectedMuscleFilter === 'favorites' ? 'Favourites' :
                     selectedMuscleFilter}
                  </Text>
                  <Ionicons
                    name={dropdownVisible === 'muscle' ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={Colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>

              {/* Favourites Toggle */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Show Favourites:</Text>
                <TouchableOpacity
                  style={[styles.favouriteToggle, selectedMuscleFilter === 'favorites' && styles.favouriteToggleSelected]}
                  onPress={() => {
                    if (selectedMuscleFilter === 'favorites') {
                      setSelectedMuscleFilter('all');
                    } else {
                      setSelectedMuscleFilter('favorites');
                    }
                  }}
                >
                  <Ionicons
                    name="heart"
                    size={16}
                    color={selectedMuscleFilter === 'favorites' ? Colors.primaryForeground : Colors.primary}
                  />
                  <Text style={[styles.favouriteToggleText, selectedMuscleFilter === 'favorites' && styles.favouriteToggleTextSelected]}>
                    {selectedMuscleFilter === 'favorites' ? 'On' : 'Off'}
                  </Text>
                </TouchableOpacity>
              </View>

              {userGyms.length > 1 && (
                <View style={[styles.filterRow, { marginBottom: 0 }]}>
                  <Text style={styles.filterLabel}>Gym:</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => handleDropdownToggle('gym')}
                  >
                    <Text style={styles.dropdownButtonText}>
                      {selectedGymFilter === 'all' ? 'All Gyms' :
                       userGyms.find(g => g.id === selectedGymFilter)?.name || 'All Gyms'}
                    </Text>
                    <Ionicons
                      name={dropdownVisible === 'gym' ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={Colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
              )}



            </View>
          </Animated.View>

          {/* Tab Content with Swipe Support and Animation */}
          <PanGestureHandler
            onHandlerStateChange={handleGestureStateChange}
            enabled={true} // Enable gesture handler for swipe detection
            minPointers={1}
            maxPointers={1}
            shouldCancelWhenOutside={false}
            activeOffsetX={[-20, 20]} // Only activate for horizontal movement > 20px
            failOffsetY={[-10, 10]} // Fail if vertical movement > 10px
          >
            <Animated.View style={[styles.tabContent, { marginTop: filterHeightAnim.interpolate({
              inputRange: [0, 160],
              outputRange: [0, 0], // Content stays in place, filters overlay
            }) }]}>
              <Animated.View
                style={[
                  styles.tabContainer,
                  {
                    transform: [{
                      translateX: tabSlideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -Dimensions.get('window').width],
                      }),
                    }],
                  },
                ]}
              >
                {/* My Exercises Tab */}
                <View style={styles.tabPage}>
                  <UserExerciseList
                    exercises={userExercises}
                    totalCount={userExercises.length}
                    loading={loading}
                    userGyms={userGyms}
                    exerciseGymsMap={exerciseGymsMap}
                    onToggleFavorite={handleToggleFavorite}
                    onDeleteExercise={handleDeleteExercise}
                    onAddToWorkout={(exercise) => handleAddToWorkout(exercise)}
                    onEditExercise={(exercise) => console.log('Edit exercise:', exercise)}
                    onInfoPress={(exercise) => console.log('Info press:', exercise)}
                    onManageGyms={(exercise) => console.log('Manage gyms:', exercise)}
                    onRefreshData={refreshExercises}
                  />
                </View>

                {/* Global Library Tab */}
                <View style={styles.tabPage}>
                  <GlobalExerciseList
                    exercises={globalExercises}
                    totalCount={globalExercises.length}
                    loading={loading}
                    onToggleFavorite={handleToggleFavorite}
                    onAddToWorkout={handleAddToWorkout}
                    onInfoPress={(exercise) => console.log('Info press:', exercise)}
                    onManageGyms={(exercise) => console.log('Manage gyms:', exercise)}
                  />
                </View>
              </Animated.View>
            </Animated.View>
          </PanGestureHandler>
        </View>
      </ScrollView>

      {/* Custom Dropdown Modal */}
      <Modal
        visible={dropdownVisible !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(null)}
      >
        <View style={styles.dropdownModal}>
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>
                {dropdownVisible === 'muscle' ? 'Select Muscle Group' : 'Select Gym'}
              </Text>
              <TouchableOpacity
                onPress={() => setDropdownVisible(null)}
                style={styles.dropdownCloseButton}
              >
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={
                dropdownVisible === 'muscle'
                  ? [
                      { label: 'All', value: 'all' },
                      ...availableMuscleGroups.map(m => ({ label: m, value: m }))
                    ].sort((a, b) => a.label.localeCompare(b.label))
                  : [
                      { label: 'All Gyms', value: 'all' },
                      ...userGyms.map(g => ({ label: g.name, value: g.id }))
                    ]
              }
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected =
                  dropdownVisible === 'muscle'
                    ? selectedMuscleFilter === item.value
                    : selectedGymFilter === item.value;

                return (
                  <TouchableOpacity
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                    onPress={() => handleDropdownSelect(dropdownVisible!, item.value)}
                  >
                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.dropdownCheckmark}>
                        <Ionicons name="checkmark" size={12} color={Colors.primaryForeground} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...TextStyles.body,
    color: Colors.foreground,
    paddingVertical: 0, // Remove default padding
    textAlignVertical: 'center',
    height: 44,
    textAlign: 'left',
    paddingTop: 2,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.primaryForeground,
  },
  tabContent: {
    flex: 1,
    minHeight: Dimensions.get('window').height * 0.6, // Ensure minimum height for swipe gestures
  },
  tabContainer: {
    flex: 1,
    flexDirection: 'row',
    width: Dimensions.get('window').width * 2, // Two screens wide
  },
  tabPage: {
    width: Dimensions.get('window').width,
    flex: 1,
  },
  tabInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  placeholderText: {
    ...TextStyles.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  bottomSheetContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  bottomSheetTitle: {
    ...TextStyles.h3,
    color: Colors.foreground,
  },
  filterSection: {
    marginBottom: Spacing.xl,
  },
  filterSectionTitle: {
    ...TextStyles.bodyBold,
    color: Colors.foreground,
    marginBottom: Spacing.md,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.muted,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterOptionText: {
    ...TextStyles.body,
    color: Colors.foreground,
  },
  filterOptionTextSelected: {
    color: Colors.primaryForeground,
    fontWeight: '600',
  },
  bottomSheetActions: {
    marginTop: 'auto',
    paddingTop: Spacing.lg,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    ...TextStyles.bodyBold,
    color: Colors.primaryForeground,
  },
  filterControls: {
    overflow: 'hidden',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    zIndex: 10, // Ensure it appears above content
    elevation: 5, // Android shadow
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 250, // Increased height to accommodate gym filter
  },
  filterControlsContent: {
    padding: Spacing.md,
    paddingBottom: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  filterLabel: {
    ...TextStyles.body,
    color: Colors.foreground,
    width: 100,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  picker: {
    color: Colors.foreground,
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
  },
  pickerItem: {
    color: Colors.foreground,
    backgroundColor: Colors.card,
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
  },
  applyFiltersButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  applyFiltersButtonText: {
    ...TextStyles.bodyBold,
    color: Colors.primaryForeground,
  },
  dropdownButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  dropdownButtonText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: Colors.foreground,
    flex: 1,
  },
  dropdownModal: {
    flex: 1,
    backgroundColor: Colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: '60%',
    width: '80%',
    shadowColor: Colors.foreground,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: Colors.foreground,
  },
  dropdownCloseButton: {
    padding: Spacing.xs,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: Colors.foreground,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.muted,
  },
  dropdownItemTextSelected: {
    color: Colors.foreground,
    fontFamily: 'Poppins_600SemiBold',
  },
  dropdownCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  favouriteIcon: {
    marginRight: Spacing.sm,
  },
  stickyHeader: {
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  favouriteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    gap: Spacing.sm,
  },
  favouriteToggleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  favouriteToggleText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: Colors.foreground,
  },
  favouriteToggleTextSelected: {
    color: Colors.primaryForeground,
  },
});
