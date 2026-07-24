import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { openDatabaseAsync } from 'expo-sqlite';
import { getPokemonOfTheDay, getTrainerProfile } from '../db/queries';
import { DexterWidget } from './DexterWidget';

export async function requestDexterWidgetUpdate() {
  try {
    const db = await openDatabaseAsync('pokedex.db');
    const pokemon = await getPokemonOfTheDay(db);
    const trainer = await getTrainerProfile(db);

    await requestWidgetUpdate({
      widgetName: 'DexterWidget',
      renderWidget: (props) => (
        <DexterWidget
          pokemon={pokemon}
          trainer={trainer}
          width={props.width}
          height={props.height}
        />
      ),
      widgetNotFound: () => {
        // No widget on home screen
      },
    });
  } catch (error) {
    console.error('Failed to update DexterWidget:', error);
  }
}
