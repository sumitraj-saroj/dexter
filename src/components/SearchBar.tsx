import React from 'react';
import { StyleSheet, TextInput, View, TouchableOpacity, Text } from 'react-native';
import { useAppTheme } from '../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onOpenFilter,
  activeFilterCount,
}) => {
  const { colorScheme } = useAppTheme();

  return (
    <View style={styles.container}>
      {/* Search Input Box */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colorScheme.surface,
            borderColor: colorScheme.outline,
          },
        ]}
      >
        <Text style={[styles.searchIcon, { color: colorScheme.secondary }]}>
          🔍
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search name or #number..."
          placeholderTextColor={colorScheme.secondary}
          style={[styles.input, { color: colorScheme.onSurface }]}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {value.length > 0 ? (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearButton}
          >
            <Text style={[styles.clearText, { color: colorScheme.secondary }]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Button with Badge */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onOpenFilter}
        style={[
          styles.filterButton,
          {
            backgroundColor: activeFilterCount > 0 ? colorScheme.primary : colorScheme.surface,
            borderColor: activeFilterCount > 0 ? colorScheme.primary : colorScheme.outline,
          },
        ]}
      >
        <Text
          style={[
            styles.filterIcon,
            { color: activeFilterCount > 0 ? colorScheme.onPrimary : colorScheme.onSurface },
          ]}
        >
          ⚡
        </Text>
        {activeFilterCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: colorScheme.onPrimary }]}>
            <Text style={[styles.badgeText, { color: colorScheme.primary }]}>
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterIcon: {
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
