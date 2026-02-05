'use client'

import React from "react"

import { createContext, useContext, useReducer, type ReactNode } from 'react'

// ============================================================================
// State shape
// ============================================================================
export interface CoinInsertion {
  pesos: number
  usdc: number
  timestamp: number
}

export interface FeeBreakdown {
  grossAmount: number
  fee: number
  netAmount: number
  feePercentage: string
}

export interface SettlementResult {
  success: boolean
  settledAmount: string
  fee: FeeBreakdown
  bridgeTxHash?: string
  destinationChain: string
  message: string
}

export interface PinData {
  pin: string
  walletId: string
  amount: string
}

export interface Ki0xkState {
  // Session (matches backend session.ts)
  sessionId: string | null
  sessionActive: boolean

  // Balance tracking
  balanceUSDC: number
  totalDepositedPesos: number
  totalDepositedUSDC: number
  coinInsertions: CoinInsertion[]

  // Destination
  destinationAddress: string
  destinationChain: string
  destinationMethod: 'qr' | 'ens' | 'nfc' | 'pin' | null

  // Settlement result
  settlementResult: SettlementResult | null

  // PIN wallet
  pinData: PinData | null

  // Legacy (kept for festival mode)
  ensName: string
  address: string
  cardId: string | null
}

// ============================================================================
// Initial state
// ============================================================================
const initialState: Ki0xkState = {
  sessionId: null,
  sessionActive: false,
  balanceUSDC: 0,
  totalDepositedPesos: 0,
  totalDepositedUSDC: 0,
  coinInsertions: [],
  destinationAddress: '',
  destinationChain: 'base',
  destinationMethod: null,
  settlementResult: null,
  pinData: null,
  ensName: '',
  address: '',
  cardId: null,
}

// ============================================================================
// Action types
// ============================================================================
type Action =
  | { type: 'START_SESSION'; payload: { ensName: string; address: string } }
  | { type: 'END_SESSION' }
  | { type: 'SET_BALANCE'; payload: number }
  | { type: 'ADD_BALANCE'; payload: number }
  | { type: 'SUBTRACT_BALANCE'; payload: number }
  | { type: 'SET_CARD_ID'; payload: string }
  | { type: 'RESET' }
  // New kiosk actions
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'INSERT_COIN'; payload: { pesos: number; usdc: number } }
  | { type: 'SET_DESTINATION'; payload: { address: string; chain: string; method: 'qr' | 'ens' | 'nfc' | 'pin' } }
  | { type: 'SET_DESTINATION_CHAIN'; payload: string }
  | { type: 'SET_SETTLEMENT_RESULT'; payload: SettlementResult }
  | { type: 'SET_PIN_DATA'; payload: PinData }

// ============================================================================
// Reducer
// ============================================================================
function reducer(state: Ki0xkState, action: Action): Ki0xkState {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        sessionActive: true,
        ensName: action.payload.ensName,
        address: action.payload.address,
      }
    case 'END_SESSION':
      return initialState
    case 'SET_BALANCE':
      return { ...state, balanceUSDC: action.payload }
    case 'ADD_BALANCE':
      return { ...state, balanceUSDC: state.balanceUSDC + action.payload }
    case 'SUBTRACT_BALANCE':
      return { ...state, balanceUSDC: Math.max(0, state.balanceUSDC - action.payload) }
    case 'SET_CARD_ID':
      return { ...state, cardId: action.payload }
    case 'RESET':
      return initialState

    // New kiosk actions
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload, sessionActive: true }
    case 'INSERT_COIN':
      return {
        ...state,
        totalDepositedPesos: state.totalDepositedPesos + action.payload.pesos,
        totalDepositedUSDC: parseFloat((state.totalDepositedUSDC + action.payload.usdc).toFixed(6)),
        balanceUSDC: parseFloat((state.balanceUSDC + action.payload.usdc).toFixed(6)),
        coinInsertions: [
          ...state.coinInsertions,
          { ...action.payload, timestamp: Date.now() },
        ],
      }
    case 'SET_DESTINATION':
      return {
        ...state,
        destinationAddress: action.payload.address,
        destinationChain: action.payload.chain,
        destinationMethod: action.payload.method,
      }
    case 'SET_DESTINATION_CHAIN':
      return { ...state, destinationChain: action.payload }
    case 'SET_SETTLEMENT_RESULT':
      return { ...state, settlementResult: action.payload }
    case 'SET_PIN_DATA':
      return { ...state, pinData: action.payload }

    default:
      return state
  }
}

// ============================================================================
// Context
// ============================================================================
const Ki0xkContext = createContext<{
  state: Ki0xkState
  dispatch: React.Dispatch<Action>
} | null>(null)

export function Ki0xkProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <Ki0xkContext.Provider value={{ state, dispatch }}>
      {children}
    </Ki0xkContext.Provider>
  )
}

export function useKi0xk() {
  const context = useContext(Ki0xkContext)
  if (!context) {
    throw new Error('useKi0xk must be used within a Ki0xkProvider')
  }
  return context
}

// ============================================================================
// Action creators
// ============================================================================
export const actions = {
  // Legacy (festival mode)
  startSession: (ensName: string, address: string): Action => ({
    type: 'START_SESSION',
    payload: { ensName, address },
  }),
  endSession: (): Action => ({ type: 'END_SESSION' }),
  setBalance: (amount: number): Action => ({ type: 'SET_BALANCE', payload: amount }),
  addBalance: (amount: number): Action => ({ type: 'ADD_BALANCE', payload: amount }),
  subtractBalance: (amount: number): Action => ({ type: 'SUBTRACT_BALANCE', payload: amount }),
  setCardId: (cardId: string): Action => ({ type: 'SET_CARD_ID', payload: cardId }),
  reset: (): Action => ({ type: 'RESET' }),

  // New kiosk actions
  setSessionId: (id: string): Action => ({ type: 'SET_SESSION_ID', payload: id }),
  insertCoin: (pesos: number, usdc: number): Action => ({
    type: 'INSERT_COIN',
    payload: { pesos, usdc },
  }),
  setDestination: (address: string, chain: string, method: 'qr' | 'ens' | 'nfc' | 'pin'): Action => ({
    type: 'SET_DESTINATION',
    payload: { address, chain, method },
  }),
  setDestinationChain: (chain: string): Action => ({
    type: 'SET_DESTINATION_CHAIN',
    payload: chain,
  }),
  setSettlementResult: (result: SettlementResult): Action => ({
    type: 'SET_SETTLEMENT_RESULT',
    payload: result,
  }),
  setPinData: (data: PinData): Action => ({
    type: 'SET_PIN_DATA',
    payload: data,
  }),
}
