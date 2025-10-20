import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../../constants/Theme';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Color tokens based on specifications
const colors = {
  light: {
    trigger: {
      bg: '#FFFFFF',
      border: '#E6E8EC',
      borderFocus: '#4C7EFF',
      borderError: '#FF4D4F',
      text: '#14171F',
      textPlaceholder: '#8A919E',
      chevron: '#6B7280',
    },
    menu: {
      bg: '#FFFFFF',
      divider: '#EEF0F4',
      option: {
        text: '#14171F',
        textDisabled: '#B0B7C3',
        hover: '#F5F7FA',
        selected: '#4C7EFF',
      },
    },
    shadow: {
      shadowColor: '#0000001A',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
  },
  dark: {
    trigger: {
      bg: '#111317',
      border: '#2A2F37',
      borderFocus: '#7AA2FF',
      borderError: '#FF6B6E',
      text: '#E6E8EC',
      textPlaceholder: '#99A1AD',
      chevron: '#6B7280',
    },
    menu: {
      bg: '#151922',
      divider: '#232834',
      option: {
        text: '#E6E8EC',
        textDisabled: '#6C7480',
        hover: '#1D2430',
        selected: '#7AA2FF',
      },
    },
    shadow: {
      shadowColor: '#0000001A',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
  },
};

interface DropdownItem {
  label: string;
  value: string;
  subtitle?: string;
  disabled?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  assistiveText?: string;
  searchable?: boolean;
  multiSelect?: boolean;
  leftIcon?: React.ReactNode;
}

const DropdownComponent = ({
  items,
  selectedValue,
  onSelect,
  placeholder = 'Select an option',
  disabled = false,
  error,
  assistiveText,
  searchable = false,
  multiSelect = false,
  leftIcon,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const chevronRotation = useRef(new Animated.Value(0)).current;
  const triggerRef = useRef<View>(null);

  const selectedItem = items.find(item => item.value === selectedValue);
  const filteredItems = searchable
    ? items.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : items;

  // Measure trigger position for proper anchoring
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      triggerRef.current.measure((fx, fy, width, height, px, py) => {
        setDropdownPosition({ top: py + height + 8, left: px, width });
      });
    }
  }, [isOpen]);

  // Animation for opening/closing
  useEffect(() => {
    if (isOpen) {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(chevronRotation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(chevronRotation, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleSelect = (value: string) => {
    if (!multiSelect) {
      onSelect(value);
      setIsOpen(false);
    } else {
      // Handle multi-select logic here if needed
      onSelect(value);
    }
  };

  const renderItem = ({ item, index }: { item: DropdownItem; index: number }) => {
    const isSelected = item.value === selectedValue;
    const isFocused = index === focusedIndex;
    const isDisabled = item.disabled;
    const isFirst = index === 0;
    const isLast = index === filteredItems.length - 1;

    return (
      <Pressable
        style={[
          styles.dropdownItem,
          isFirst && styles.dropdownItemFirst,
          isLast && styles.dropdownItemLast,
          isSelected && styles.dropdownItemSelected,
          isFocused && styles.dropdownItemFocused,
          isDisabled && styles.dropdownItemDisabled,
        ]}
        onPress={() => !isDisabled && handleSelect(item.value)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      >
        <View style={styles.dropdownItemContent}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <View style={styles.dropdownItemTextContainer}>
            <Text
              style={[
                styles.dropdownItemText,
                isSelected && styles.dropdownItemTextSelected,
                isDisabled && styles.dropdownItemTextDisabled,
              ]}
              numberOfLines={2}
            >
              {item.label}
            </Text>
            {item.subtitle && (
              <Text
                style={[
                  styles.dropdownItemSubtitle,
                  isDisabled && styles.dropdownItemSubtitleDisabled,
                ]}
              >
                {item.subtitle}
              </Text>
            )}
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark" size={20} color="#000000" />
        )}
      </Pressable>
    );
  };

  const chevronRotate = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getBorderColor = () => {
    if (error) return colors.light.trigger.borderError;
    if (disabled) return colors.light.trigger.border;
    return colors.light.trigger.border;
  };

  return (
    <View style={styles.container}>
      <Pressable
        ref={triggerRef}
        style={[
          styles.dropdownTrigger,
          {
            backgroundColor: colors.light.trigger.bg,
            borderColor: getBorderColor(),
          },
          disabled && styles.dropdownTriggerDisabled,
          error && styles.dropdownTriggerError,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen, disabled }}
        accessibilityLabel={selectedItem ? selectedItem.label : placeholder}
      >
        <View style={styles.triggerContent}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            style={[
              styles.dropdownTriggerText,
              !selectedItem && styles.dropdownTriggerPlaceholder,
              disabled && styles.dropdownTriggerTextDisabled,
              error && styles.dropdownTriggerTextError,
            ]}
            numberOfLines={1}
          >
            {selectedItem ? selectedItem.label : placeholder}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Ionicons
            name="chevron-down"
            size={20}
            color={disabled ? colors.light.trigger.textPlaceholder : colors.light.trigger.chevron}
          />
        </Animated.View>
      </Pressable>

      {error && assistiveText && (
        <Text style={styles.assistiveText}>{assistiveText}</Text>
      )}

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.dropdownMenu,
                {
                  position: 'absolute',
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  width: dropdownPosition.width,
                  backgroundColor: colors.light.menu.bg,
                  shadowColor: colors.light.shadow.shadowColor,
                  shadowOpacity: colors.light.shadow.shadowOpacity,
                  shadowRadius: colors.light.shadow.shadowRadius,
                  shadowOffset: colors.light.shadow.shadowOffset,
                  elevation: Platform.OS === 'android' ? 6 : 0,
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              {searchable && (
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search options..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={colors.light.trigger.textPlaceholder}
                  />
                </View>
              )}

              <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.value}
                showsVerticalScrollIndicator={true}
                style={[
                  styles.dropdownList,
                  { maxHeight: Math.min(screenHeight * 0.8, filteredItems.length * 48 + (searchable ? 48 : 0)) },
                ]}
                getItemLayout={(data, index) => ({
                  length: 48,
                  offset: 48 * index,
                  index,
                })}
                keyboardShouldPersistTaps="handled"
              />

              {filteredItems.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No options</Text>
                </View>
              )}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// Default export for React component
export default DropdownComponent;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dropdownTriggerDisabled: {
    opacity: 0.6,
  },
  dropdownTriggerError: {
    borderColor: colors.light.trigger.borderError,
  },
  triggerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  dropdownTriggerText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.light.trigger.text,
    flex: 1,
  },
  dropdownTriggerPlaceholder: {
    color: colors.light.trigger.textPlaceholder,
    fontWeight: '400',
  },
  dropdownTriggerTextDisabled: {
    color: colors.light.trigger.textPlaceholder,
  },
  dropdownTriggerTextError: {
    color: colors.light.trigger.borderError,
  },
  assistiveText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.light.trigger.borderError,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdownMenu: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.menu.divider,
    maxHeight: screenHeight * 0.4,
    minWidth: 200,
    maxWidth: screenWidth * 0.9,
  },
  dropdownList: {
    maxHeight: screenHeight * 0.5,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.menu.divider,
  },
  searchInput: {
    padding: 12,
    backgroundColor: colors.light.trigger.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.trigger.border,
    fontSize: 16,
    color: colors.light.trigger.text,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  dropdownItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dropdownItemLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dropdownItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItemTextContainer: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000000',
    fontWeight: '400',
  },
  dropdownItemSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.light.trigger.textPlaceholder,
    marginTop: 2,
  },
  dropdownItemSelected: {
    backgroundColor: colors.light.menu.option.hover,
  },
  dropdownItemFocused: {
    backgroundColor: colors.light.menu.option.hover,
  },
  dropdownItemDisabled: {
    opacity: 0.6,
  },
  dropdownItemTextSelected: {
    color: '#000000',
    fontWeight: '600',
  },
  dropdownItemTextDisabled: {
    color: colors.light.menu.option.textDisabled,
  },
  dropdownItemSubtitleDisabled: {
    color: colors.light.menu.option.textDisabled,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.light.trigger.textPlaceholder,
  },
});