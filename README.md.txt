# homebridge-gecko-intouch2

Homebridge plugin for Gecko in.touch2 via a local HTTP sidecar that uses geckolib.  
Exports a Thermostat (water temp), a Pump 1 switch and a Spa Light to Apple Home.

## Requirements
- Node.js 18+ and Homebridge 1.6+.
- Running sidecar providing REST endpoints at /status, /set/target_temperature, /set/target_state, /set/pump/1, /set/light.

## Install (dev)
- npm install
- npm run build
- npm link
- Add platform in Homebridge UI and set Base URL to your sidecar (e.g. http://NAS_IP:8088).

## Configure
Example config (added by UI):

{
"platform": "GeckoInTouch2",
"baseUrl": "http://127.0.0.1:8088",
"pollingIntervalSec": 5,
"accessories": { "thermostat": true, "pump1": true, "light": true }
}


## Sidecar API
- GET /status -> { currentTemperature, targetTemperature, heating, pump1, light }
- POST /set/target_temperature { value: number }
- POST /set/target_state { value: 0|1 }  # 0 Off, 1 Heat
- POST /set/pump/1 { on: boolean }
- POST /set/light { on: boolean }

## Notes
- Temperature range is set to 26–40 °C; adjust in code if needed.
- For multiple pumps/lights, duplicate service creation and map to additional endpoints.
