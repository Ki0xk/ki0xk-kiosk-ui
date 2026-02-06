# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Coinslot is an Arduino-based coin acceptor system built with PlatformIO. It reads coin pulses from a coin acceptor device via hardware interrupts and classifies them by monetary value (1, 2, or 5 peso coins).

## Build Commands

```bash
# Build for Arduino UNO
platformio run -e uno

# Upload to connected board
platformio run -e uno --target upload

# Monitor serial output (115200 baud)
platformio device monitor -b 115200

# Build and upload in one step
platformio run -e uno --target upload && platformio device monitor -b 115200
```

## Architecture

**Single-file firmware** (`src/main.cpp`) with interrupt-driven coin detection:

- **Hardware interrupt handler** (`onCoinPulse`) counts falling-edge pulses on GPIO 2 with 2.5ms debounce
- **Main loop** monitors pulse gaps (240ms silence = coin complete) and classifies coins by pulse count
- **Pulse thresholds**: 1-peso (1-2 pulses), 2-peso (5-10 pulses), 5-peso (11-16 pulses)
- **JSON serial output**: `{"type":"coin","pulses":13,"value":5,"ok":true}`

**Key parameters** (in main.cpp):
- `DEBOUNCE_US = 2500` - noise filtering threshold in microseconds
- `COIN_GAP_MS = 240` - silence duration indicating coin completion
- `COIN_PIN` - configurable via build flag in platformio.ini (default: GPIO 2)

## Hardware Configuration

- Target: Arduino UNO (ATmega328P)
- Coin sensor connected to pin 2 (interrupt-capable) with INPUT_PULLUP
- Serial communication at 115200 baud
