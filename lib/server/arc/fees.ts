export const FEE_RATE = 0.00001

export interface FeeBreakdown {
  grossAmount: number
  fee: number
  netAmount: number
  feePercentage: string
}

export function calculateFee(amount: number): FeeBreakdown {
  const fee = amount * FEE_RATE
  const netAmount = amount - fee
  return {
    grossAmount: amount,
    fee: parseFloat(fee.toFixed(6)),
    netAmount: parseFloat(netAmount.toFixed(6)),
    feePercentage: '0.001%',
  }
}
