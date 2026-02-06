# Ki0xk Coinslot — Physical Coin Acceptor Module

Arduino Uno firmware for pulse-based electronic coin acceptors. Detects inserted coins via hardware interrupts, classifies by denomination, and emits JSON events over serial for the Ki0xk kiosk backend.

## How It Works

```
  [Coin Inserted]
       |
       v
  Coin Acceptor (pulse output)
       |
       v  COIN signal (Pin 2)
  Arduino Uno (interrupt-driven pulse counter)
       |
       v  Serial JSON @ 115200 baud
  Ki0xk Kiosk Backend (USB /dev/ttyUSB0)
       |
       v
  Session deposit (peso -> USDC conversion)
```

The coin acceptor sends a burst of electrical pulses for each coin. Different denominations produce different pulse counts. The Arduino counts pulses using a hardware interrupt, waits for a silence gap (no more pulses), then classifies the coin and emits a JSON event.

## Hardware

### Bill of Materials

| Component | Purpose |
|-----------|---------|
| Arduino Uno clone (ATmega328P) | Pulse counter + serial output |
| Electronic coin acceptor (pulse-based, normally open) | Coin detection |
| 5V DC power adapter with barrel jack | Powers the coin acceptor |
| Barrel jack breakout PCB (green board) | Extracts 5V/GND from the adapter |
| Breadboard | Common ground bus + signal routing |
| Jumper wires (male-to-male, male-to-female) | Connections between components |
| Copper wire segments (optional) | Bridge from breakout PCB pads to jumper wires |

### Wiring Diagram

```
                    5V DC Power Adapter
                         |
                         v
              ┌─────────────────────┐
              │  Barrel Jack        │
              │  Breakout PCB       │
              │                     │
              │   (+) ─── 5V out    │──────────────┐
              │   (-) ─── GND out   │──────┐       │
              └─────────────────────┘      │       │
                                           │       │
                                           v       v
                                    ┌──────────────────┐
                                    │    Breadboard     │
                                    │                   │
                                    │  GND bus ─────────┼──┐
                                    │  5V  bus ─────────┼──┼──┐
                                    └──────────────────┘  │  │
                                           │              │  │
                          ┌────────────────┘              │  │
                          │                               │  │
                          v                               v  v
                   ┌─────────────┐              ┌──────────────────┐
                   │ Arduino Uno │              │  Coin Acceptor   │
                   │             │              │                  │
                   │  GND ───────┼── shared ────┼── GND (black)    │
                   │  Pin 2 ─────┼──────────────┼── COIN (gray)    │
                   │             │              │  VCC ─── 5V      │
                   │  USB ───────┼── to PC      │                  │
                   └─────────────┘              └──────────────────┘
```

### Key Wiring Points

1. **Power**: The 5V adapter powers the coin acceptor through the barrel jack breakout board. The Arduino is powered separately via USB from the PC.

2. **Shared ground**: The GND from the barrel jack breakout, the Arduino GND, and the coin acceptor GND all connect together on the breadboard's ground bus. This common ground is essential for the pulse signal to work.

3. **Signal**: The coin acceptor's COIN output (pulse/signal wire) connects to Arduino **Pin 2** (hardware interrupt capable). Pin 2 is configured with `INPUT_PULLUP` since the acceptor uses an open-collector output that pulls to GND on each pulse.

4. **Trigger mode**: Set the coin acceptor to **Normally Open (NO)** circuit mode.

### Coin Acceptor Setup

Set the coin acceptor's pulse speed to **MEDIUM**:

| Speed | Stability | Notes |
|-------|-----------|-------|
| Fast | Unstable | Pulses merge, unreliable counts |
| **Medium** | Stable | Recommended setting |
| Slow | Somewhat unstable | Occasional miscounts |

Program the acceptor to output the following pulses per denomination:

| Coin | Programmed Pulses | Observed Range (medium) |
|------|-------------------|------------------------|
| 1 peso | 1 | 1-2 pulses |
| 2 pesos | 6 | 5-10 pulses |
| 5 pesos | 13 | 11-16 pulses |

The firmware uses wide tolerance ranges to handle pulse drift at medium speed.

## Software

### Prerequisites

- [PlatformIO CLI](https://platformio.org/install/cli) installed
- Arduino Uno connected via USB (`/dev/ttyUSB0` on Linux)

### Build and Upload

```bash
cd Coinslot

# Build only
pio run -e uno

# Build and upload to Arduino
pio run -e uno --target upload

# Monitor serial output
pio device monitor -b 115200

# Build, upload, and monitor in one step
pio run -e uno --target upload && pio device monitor -b 115200
```

### Serial Output Format

JSON lines at 115200 baud:

```
{"type":"status","msg":"READY coin-pulse reader"}
{"type":"coin","pulses":1,"value":1,"ok":true}
{"type":"coin","pulses":7,"value":2,"ok":true}
{"type":"coin","pulses":13,"value":5,"ok":true}
{"type":"coin","pulses":4,"value":0,"ok":false}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"coin"` or `"status"` | Event type |
| `pulses` | number | Raw pulse count from acceptor |
| `value` | 1, 2, 5, or 0 | Denomination in pesos (0 = unrecognized) |
| `ok` | boolean | `true` if valid denomination, `false` if unknown |

### Pulse Classification

Defined in `src/main.cpp` `classifyCoin()`:

| Pulse Range | Denomination | USDC Equivalent |
|-------------|-------------|-----------------|
| 1-2 | 1 peso | $0.05 |
| 5-10 | 2 pesos | $0.10 |
| 11-16 | 5 pesos | $0.25 |
| other | unknown (rejected) | - |

### Tunable Parameters

In `src/main.cpp`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `DEBOUNCE_US` | 2500 | Noise filtering (microseconds). Ignore edges closer than this. |
| `COIN_GAP_MS` | 240 | Silence gap to finalize coin (milliseconds). After this many ms with no pulses, the coin is classified and emitted. |
| `COIN_PIN` | 2 | GPIO pin for coin signal. Configurable via `platformio.ini` build flag. Must be interrupt-capable (Pin 2 or 3 on Uno). |

## Integration with Ki0xk Backend

The kiosk backend reads serial JSON from `/dev/ttyUSB0` and processes coin events:

```
Arduino serial output  -->  Backend reads JSON line
                            -->  depositToSession(pesoToUsdc(value))
                            -->  Session balance updated
```

The backend's `pesoToUsdc()` conversion and `depositToSession()` function handle the rest. See [kiosk/](../kiosk/) for the backend.

The frontend ([ki0xk-kiosk-ui](https://github.com/Ki0xk/ki0xk-kiosk-ui)) includes a CoinSlotSimulator component for development without physical hardware.

## Project Structure

```
Coinslot/
  platformio.ini     # PlatformIO config (board, baud rate, build flags)
  src/
    main.cpp         # Single-file firmware (interrupt handler + classifier)
  CLAUDE.md          # AI assistant context
  README.md          # This file
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No serial output | Check USB cable, verify `/dev/ttyUSB0` exists, check baud rate is 115200 |
| All coins read as 1 pulse | Shared GND missing between Arduino and coin acceptor |
| Erratic pulse counts | Switch coin acceptor to MEDIUM speed, check wiring for loose connections |
| `value: 0` for valid coins | Adjust pulse ranges in `classifyCoin()` to match your acceptor |
| Permission denied on upload | `sudo chmod a+rw /dev/ttyUSB0` or add user to `dialout` group |

## License

MIT
