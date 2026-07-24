import React from 'react';
import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { openDatabaseAsync } from 'expo-sqlite';
import { getPokemonOfTheDay, getTrainerProfile } from '../db/queries';
import { DexterWidget } from './DexterWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo, renderWidget } = props;

  if (
    widgetAction === 'WIDGET_ADDED' ||
    widgetAction === 'WIDGET_UPDATE' ||
    widgetAction === 'WIDGET_RESIZED'
  ) {
    try {
      const db = await openDatabaseAsync('pokedex.db');
      const pokemon = await getPokemonOfTheDay(db);
      const trainer = await getTrainerProfile(db);

      renderWidget(
        <DexterWidget
          pokemon={pokemon}
          trainer={trainer}
          width={widgetInfo.width}
          height={widgetInfo.height}
        />
      );
    } catch (error) {
      console.error('Error fetching data for DexterWidget:', error);
      renderWidget(
        <DexterWidget
          pokemon={null}
          trainer={null}
          width={widgetInfo.width}
          height={widgetInfo.height}
        />
      );
    }
  }
}
