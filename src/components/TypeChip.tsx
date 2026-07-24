import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { PokemonType } from '../types';
import { TYPE_SEED_COLORS } from '../theme/colors';

interface TypeChipProps {
  type: PokemonType;
  selected?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

// Types with high luminance where dark text provides optimal WCAG 4.5:1 contrast
const LIGHT_BACKGROUND_TYPES: Set<PokemonType> = new Set(['electric', 'ice', 'fairy']);

const TypeChipComponent: React.FC<TypeChipProps> = ({
  type,
  selected = true,
  onPress,
  size = 'small',
  style,
}) => {
  const baseColor = TYPE_SEED_COLORS[type] || '#9E9E9E';
  const isLightType = LIGHT_BACKGROUND_TYPES.has(type);

  const isSmall = size === 'small';

  const textColor = selected
    ? isLightType
      ? '#1C1B1F'
      : '#FFFFFF'
    : baseColor;

  const content = (
    <Text
      style={[
        isSmall ? styles.smallText : styles.mediumText,
        { color: textColor },
      ]}
    >
      {type.toUpperCase()}
    </Text>
  );

  const containerStyle = [
    isSmall ? styles.smallChip : styles.mediumChip,
    {
      backgroundColor: selected ? baseColor : 'transparent',
      borderColor: baseColor,
      borderWidth: selected ? 0 : 1,
    },
    onPress ? styles.touchableMinTarget : null,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={containerStyle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

export const TypeChip = React.memo(TypeChipComponent);

const styles = StyleSheet.create({
  smallChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  mediumChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  touchableMinTarget: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  mediumText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
