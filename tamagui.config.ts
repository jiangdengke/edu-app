import { createTamagui } from 'tamagui';
import { config as tamaguiConfig } from '@tamagui/config/v3';

const config = createTamagui({
  ...tamaguiConfig,
  themeClassNameOnRoot: true,
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
