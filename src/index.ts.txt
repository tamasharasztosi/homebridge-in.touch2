import { API } from 'homebridge';
import { GeckoPlatform } from './platform';

const PLATFORM_NAME = 'GeckoInTouch2';

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, GeckoPlatform);
};
