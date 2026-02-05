'use client'

import React from "react"

import { createContext, useContext, useReducer, type ReactNode } from 'react'

// State shape
export interface Ki0xkState {
  sessionActive: boolean
  balanceUSDC: number
  ensName: string
  address: string
  cardId: string | null
}

// Initial state
const initialState: Ki0xkState = {
  sessionActive: false,
  balanceUSDC: 0,
  ensName: '',
  address: '',
  cardId: null,
}

// Action types
type Action =
  | { type: 'START_SESSION'; payload: { ensName: string; address: string } }
  | { type: 'END_SESSION' }
  | { type: 'SET_BALANCE'; payload: number }
  | { type: 'ADD_BALANCE'; payload: number }
  | { type: 'SUBTRACT_BALANCE'; payload: number }
  | { type: 'SET_CARD_ID'; payload: string }
  | { type: 'RESET' }

// Reducer
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
    default:
      return state
  }
}

// Context
const Ki0xkContext = createContext<{
  state: Ki0xkState
  dispatch: React.Dispatch<Action>
} | null>(null)

// Provider component
export function Ki0xkProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <Ki0xkContext.Provider value={{ state, dispatch }}>
      {children}
    </Ki0xkContext.Provider>
  )
}

// Hook to use state
export function useKi0xk() {
  const context = useContext(Ki0xkContext)
  if (!context) {
    throw new Error('useKi0xk must be used within a Ki0xkProvider')
  }
  return context
}

// Action creators for convenience
export const actions = {
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
}
