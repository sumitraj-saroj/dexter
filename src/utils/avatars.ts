export interface AvatarOption {
  id: string;
  name: string;
  pokemonId: number;
  artworkUrl: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'pikachu',
    name: 'Pikachu',
    pokemonId: 25,
    artworkUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  },
  {
    id: 'bulbasaur',
    name: 'Bulbasaur',
    pokemonId: 1,
    artworkUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
  },
  {
    id: 'charmander',
    name: 'Charmander',
    pokemonId: 4,
    artworkUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png',
  },
  {
    id: 'squirtle',
    name: 'Squirtle',
    pokemonId: 7,
    artworkUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png',
  },
  {
    id: 'eevee',
    name: 'Eevee',
    pokemonId: 133,
    artworkUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png',
  },
];

export function getAvatarById(id: string): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.id === id) || AVATAR_OPTIONS[0];
}
