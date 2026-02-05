'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DeprecatedWalletPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/app/kiosk') }, [router])
  return null
}
