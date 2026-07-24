import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { Pokemon, TrainerProfile } from '../types';
import { TYPE_SEED_COLORS } from '../theme/colors';

export interface DexterWidgetProps {
  pokemon: Pokemon | null;
  trainer: TrainerProfile | null;
  width: number;
  height: number;
}

function formatName(name: string): string {
  if (!name) return 'Pikachu';
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function DexterWidget({ pokemon, trainer, width, height }: DexterWidgetProps) {
  const isSmall = width < 220 || height < 140;
  const pokemonId = pokemon?.id || 25;
  const pokemonName = formatName(pokemon?.name || 'Pikachu');
  const pokemonNumber = pokemon?.number ? `#${pokemon.number}` : '#025';
  const primaryType = pokemon?.primaryType || 'electric';
  const typeColor = (TYPE_SEED_COLORS[primaryType] || '#3F51B5') as `#${string}`;
  const artworkUrl = (pokemon?.officialArtworkUrl ||
    pokemon?.spriteUrl ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`) as `https://${string}`;

  const streak = trainer?.currentStreak || 0;
  const level = trainer?.level || 1;
  const xpProgress = trainer?.xpProgress || 0;
  const xpPercentage = Math.min(100, Math.max(5, Math.round((xpProgress / 500) * 100)));

  const deepLinkUri = `dexter://pokemon/${pokemonId}`;

  if (isSmall) {
    return (
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          backgroundColor: '#121218',
          borderRadius: 18,
          padding: 10,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: deepLinkUri }}
      >
        {/* Top Header Badge */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'match_parent',
          }}
        >
          <TextWidget
            text="SPOTLIGHT"
            style={{
              fontSize: 9,
              fontWeight: 'bold',
              color: 'rgba(255, 255, 255, 0.6)',
              letterSpacing: 0.5,
            }}
          />
          <TextWidget
            text={pokemonNumber}
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: typeColor,
            }}
          />
        </FlexWidget>

        {/* Artwork */}
        <ImageWidget
          image={artworkUrl}
          imageWidth={64}
          imageHeight={64}
          resizeMode="contain"
        />

        {/* Bottom Label */}
        <TextWidget
          text={pokemonName}
          maxLines={1}
          truncate="END"
          style={{
            fontSize: 13,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    );
  }

  // Medium / Large responsive layout
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: '#121218',
        borderRadius: 20,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: deepLinkUri }}
    >
      {/* Top Section: Left Info + Right Artwork */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          flex: 1,
        }}
      >
        {/* Left Column */}
        <FlexWidget
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            flex: 1,
          }}
        >
          <TextWidget
            text={`SPOTLIGHT ${pokemonNumber}`}
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: 'rgba(255, 255, 255, 0.55)',
              letterSpacing: 0.5,
            }}
          />
          <TextWidget
            text={pokemonName}
            maxLines={1}
            truncate="END"
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#FFFFFF',
              marginTop: 2,
              marginBottom: 6,
            }}
          />

          {/* Type Chip */}
          <FlexWidget
            style={{
              backgroundColor: typeColor,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <TextWidget
              text={primaryType.toUpperCase()}
              style={{
                fontSize: 10,
                fontWeight: 'bold',
                color: '#FFFFFF',
              }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Right Column: Image */}
        <ImageWidget
          image={artworkUrl}
          imageWidth={72}
          imageHeight={72}
          resizeMode="contain"
        />
      </FlexWidget>

      {/* Divider */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 1,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          marginVertical: 6,
        }}
      />

      {/* Bottom Section: Trainer Stats */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        {/* Level */}
        <TextWidget
          text={`LVL ${level}`}
          style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: '#FFD700',
          }}
        />

        {/* Streak */}
        <TextWidget
          text={`🔥 ${streak}d`}
          style={{
            fontSize: 11,
            fontWeight: 'bold',
            color: '#FF7043',
            marginHorizontal: 8,
          }}
        />

        {/* XP Progress Bar Container */}
        <FlexWidget
          style={{
            flex: 1,
            height: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: 3,
            overflow: 'hidden',
            flexDirection: 'row',
          }}
        >
          <FlexWidget
            style={{
              height: 6,
              backgroundColor: '#4CAF50',
              borderRadius: 3,
              flex: xpPercentage / 100,
            }}
          />
          <FlexWidget
            style={{
              height: 6,
              flex: (100 - xpPercentage) / 100,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
