import 'react-native-gesture-handler';

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { TamaguiProvider } from 'tamagui';

import RootNavigator from '@/navigation/RootNavigator';
import { store } from '@/store';
import tamaguiConfig from './tamagui.config';

export default function App() {
  return (
    <ReduxProvider store={store}>
      <TamaguiProvider config={tamaguiConfig}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </TamaguiProvider>
    </ReduxProvider>
  );
}
