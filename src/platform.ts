import axios from 'axios';
import {
  API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic,
} from 'homebridge';
import { GeckoSpaAccessory } from './platformAccessory';

const PLUGIN_NAME = 'homebridge-gecko-intouch2';
const PLATFORM_NAME = 'GeckoInTouch2';

export class GeckoPlatform implements DynamicPlatformPlugin {
  private readonly accessories: PlatformAccessory[] = [];
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public baseUrl: string;
  public pollingIntervalSec: number;
  public accessoriesConfig: { thermostat: boolean; pump1: boolean; light: boolean };

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = this.api.hap.Service;
    this.Characteristic = this.api.hap.Characteristic;

    this.baseUrl = (this.config.baseUrl as string) || 'http://127.0.0.1:8088';
    this.pollingIntervalSec = Number(this.config.pollingIntervalSec ?? 5);
    this.accessoriesConfig = {
      thermostat: this.config.accessories?.thermostat ?? true,
      pump1: this.config.accessories?.pump1 ?? true,
      light: this.config.accessories?.light ?? true,
    };

    this.api.on('didFinishLaunching', () => {
      this.discover();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.accessories.push(accessory);
  }

  async discover() {
    const uuid = this.api.hap.uuid.generate('gecko:spa:default');
    let accessory = this.accessories.find(a => a.UUID === uuid);

    if (!accessory) {
      accessory = new this.api.platformAccessory('Gecko Spa', uuid);
      accessory.context.device = { id: 'spa-1' };
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.log.info('Registered new accessory Gecko Spa');
    } else {
      this.log.info('Restoring existing accessory Gecko Spa');
    }

    new GeckoSpaAccessory(this, accessory!, this.baseUrl, this.accessoriesConfig, this.pollingIntervalSec);
  }
}
