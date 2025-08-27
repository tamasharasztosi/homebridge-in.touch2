import axios from 'axios';
import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { GeckoPlatform } from './platform';

type Status = {
  currentTemperature: number;
  targetTemperature: number;
  heating: boolean;
  pump1: boolean;
  light: boolean;
};

export class GeckoSpaAccessory {
  private thermostat?: any;
  private pump1Switch?: any;
  private lightBulb?: any;

  private pollTimer?: NodeJS.Timeout;

  constructor(
    private readonly platform: GeckoPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly baseUrl: string,
    private readonly accessoriesConfig: { thermostat: boolean; pump1: boolean; light: boolean },
    private readonly pollingIntervalSec: number,
  ) {
    const { Service, Characteristic } = this.platform;

    this.accessory.getService(Service.AccessoryInformation)!
      .setCharacteristic(Characteristic.Manufacturer, 'Gecko')
      .setCharacteristic(Characteristic.Model, 'in.touch2');

    // Thermostat
    if (this.accessoriesConfig.thermostat) {
      this.thermostat = this.accessory.getService(Service.Thermostat)
        || this.accessory.addService(Service.Thermostat, 'Spa Thermostat');

      this.thermostat.getCharacteristic(Characteristic.CurrentTemperature)
        .onGet(async () => (await this.getStatus()).currentTemperature);

      this.thermostat.getCharacteristic(Characteristic.TargetTemperature)
        .onGet(async () => (await this.getStatus()).targetTemperature)
        .onSet(async (value: CharacteristicValue) => {
          await axios.post(`${this.baseUrl}/set/target_temperature`, { value: Number(value) });
        });

      this.thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .onGet(async () => ((await this.getStatus()).heating ? 1 : 0));

      this.thermostat.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .onGet(async () => ((await this.getStatus()).heating ? 1 : 0))
        .onSet(async (value: CharacteristicValue) => {
          const v = Number(value);
          await axios.post(`${this.baseUrl}/set/target_state`, { value: v }); // 0 Off, 1 Heat
        });

      // Optionally limit temperature range
      this.thermostat.getCharacteristic(Characteristic.TemperatureDisplayUnits).updateValue(0);
      this.thermostat.setCharacteristic(Characteristic.MinTemperature, 26);
      this.thermostat.setCharacteristic(Characteristic.MaxTemperature, 40);
    }

    // Pump 1 as switch
    if (this.accessoriesConfig.pump1) {
      this.pump1Switch = this.accessory.getService('Spa Pump 1')
        || this.accessory.addService(Service.Switch, 'Spa Pump 1', 'pump1');

      this.pump1Switch.getCharacteristic(Characteristic.On)
        .onGet(async () => (await this.getStatus()).pump1)
        .onSet(async (value: CharacteristicValue) => {
          await axios.post(`${this.baseUrl}/set/pump/1`, { on: Boolean(value) });
        });
    }

    // Spa Light
    if (this.accessoriesConfig.light) {
      this.lightBulb = this.accessory.getService('Spa Light')
        || this.accessory.addService(Service.Lightbulb, 'Spa Light', 'light');

      this.lightBulb.getCharacteristic(Characteristic.On)
        .onGet(async () => (await this.getStatus()).light)
        .onSet(async (value: CharacteristicValue) => {
          await axios.post(`${this.baseUrl}/set/light`, { on: Boolean(value) });
        });
    }

    // Start polling to keep UI in sync
    this.startPolling();
  }

  private startPolling() {
    const intervalMs = Math.max(2000, this.pollingIntervalSec * 1000);
    const doPoll = async () => {
      try {
        const s = await this.getStatus();
        if (this.thermostat) {
          this.thermostat.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, s.currentTemperature);
          this.thermostat.updateCharacteristic(this.platform.Characteristic.TargetTemperature, s.targetTemperature);
          this.thermostat.updateCharacteristic(
            this.platform.Characteristic.CurrentHeatingCoolingState,
            s.heating ? 1 : 0,
          );
          this.thermostat.updateCharacteristic(
            this.platform.Characteristic.TargetHeatingCoolingState,
            s.heating ? 1 : 0,
          );
        }
        if (this.pump1Switch) {
          this.pump1Switch.updateCharacteristic(this.platform.Characteristic.On, s.pump1);
        }
        if (this.lightBulb) {
          this.lightBulb.updateCharacteristic(this.platform.Characteristic.On, s.light);
        }
      } catch (err) {
        this.platform.log.debug('Polling error', String(err));
      } finally {
        this.pollTimer = setTimeout(doPoll, intervalMs);
      }
    };
    doPoll();
  }

  private async getStatus(): Promise<Status> {
    const { data } = await axios.get<Status>(`${this.baseUrl}/status`, { timeout: 4000 });
    return data;
  }
}
