#include <Arduino.h>

#ifndef COIN_PIN
#define COIN_PIN 2
#endif

// --- Tune for MEDIUM speed ---
static const uint16_t DEBOUNCE_US = 2500;   // ignore edges closer than this (noise)
static const uint16_t COIN_GAP_MS = 240;    // no pulses for this long => coin finished

volatile uint16_t g_pulseCount = 0;
volatile uint32_t g_lastEdgeUs = 0;

static uint16_t lastObservedCount = 0;
static uint32_t lastPulseMs = 0;
static bool coinInProgress = false;

// --- Coin classification (tolerant ranges) ---
enum CoinType : uint8_t {
  COIN_UNKNOWN = 0,
  COIN_1_PESO  = 1,
  COIN_2_PESO  = 2,
  COIN_5_PESO  = 5
};

CoinType classifyCoin(uint16_t p) {
  // Your observed ranges on MEDIUM:
  // 1 peso: 1/2
  // 2 pesos: 6/7
  // 5 pesos: 12..16 (can drift)
  if (p >= 1 && p <= 2)  return COIN_1_PESO;
  if (p >= 5 && p <= 10)  return COIN_2_PESO;
  if (p >= 11 && p <= 16) return COIN_5_PESO;
  return COIN_UNKNOWN;
}

int valueFromCoin(CoinType c) {
  return (int)c; // 1,2,5 or 0
}

// ISR for AVR/UNO
void onCoinPulse() {
  uint32_t nowUs = micros();
  if (nowUs - g_lastEdgeUs < DEBOUNCE_US) return;
  g_lastEdgeUs = nowUs;
  g_pulseCount++;
}

void resetCoinState() {
  noInterrupts();
  g_pulseCount = 0;
  g_lastEdgeUs = micros();
  interrupts();

  lastObservedCount = 0;
  coinInProgress = false;
}

void emitCoinEvent(uint16_t pulses) {
  CoinType coin = classifyCoin(pulses);
  int value = valueFromCoin(coin);

  // JSON line for easy parsing in Node/Python
  // Example: {"type":"coin","pulses":13,"value":5}
  Serial.print("{\"type\":\"coin\",\"pulses\":");
  Serial.print(pulses);
  Serial.print(",\"value\":");
  Serial.print(value);
  Serial.print(",\"ok\":");
  Serial.print(value > 0 ? "true" : "false");
  Serial.println("}");
}

void setup() {
  Serial.begin(115200);
  delay(200);

  // Typical coin acceptor output: open-collector to GND => pullup is correct
  pinMode(COIN_PIN, INPUT_PULLUP);

  // If your pulses are active-low (most are), FALLING is correct.
  // If it ever stops counting, try RISING.
  attachInterrupt(digitalPinToInterrupt(COIN_PIN), onCoinPulse, FALLING);

  Serial.println("{\"type\":\"status\",\"msg\":\"READY coin-pulse reader\"}");
}

void loop() {
  noInterrupts();
  uint16_t pulses = g_pulseCount;
  interrupts();

  // coin started?
  if (!coinInProgress && pulses != lastObservedCount) {
    coinInProgress = true;
    lastPulseMs = millis();
  }

  // new pulse?
  if (pulses != lastObservedCount) {
    lastPulseMs = millis();
    lastObservedCount = pulses;
  }

  // coin finished by silence gap
  if (coinInProgress && (millis() - lastPulseMs >= COIN_GAP_MS)) {
    emitCoinEvent(pulses);
    resetCoinState();
  }

  delay(5);
}
