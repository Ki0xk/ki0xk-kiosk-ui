'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DeprecatedAddBalancePage() {
  const router = useRouter()
  useEffect(() => { router.replace('/app/kiosk/buy') }, [router])
  return null
}
