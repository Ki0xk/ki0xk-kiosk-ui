'use client'

import { useEffect, useState } from 'react'

interface ProgressBarProps {
  progress: number
  isAnimating?: boolean
  onComplete?: () => void
}

export function ProgressBar({ progress, isAnimating = false, onComplete }: ProgressBarProps) {
  const [currentProgress, setCurrentProgress] = useState(0)
  const segments = 10
  const filledSegments = Math.floor((currentProgress / 100) * segments)

  useEffect(() => {
    if (isAnimating) {
      setCurrentProgress(0)
      const interval = setInterval(() => {
        setCurrentProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            onComplete?.()
            return 100
          }
          return prev + 10
        })
      }, 200)
      return () => clearInterval(interval)
    } else {
      setCurrentProgress(progress)
    }
  }, [progress, isAnimating, onComplete])

  // Holographic colors for each segment
  const segmentColors = [
    '#78ffd6', '#6ce8d0', '#65d5c8', '#667eea', '#6c6ee0',
    '#764ba2', '#9060b0', '#c075d0', '#f093fb', '#ffd700',
  ]

  return (
    <div className="w-full">
      <div
        className="flex gap-1 p-2 border-2 border-[#2a2a4a]"
        style={{
          backgroundColor: '#0f0f24',
          boxShadow: 'inset 2px 2px 0px 0px rgba(0,0,0,0.3)',
        }}
      >
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="h-6 flex-1 transition-all duration-150"
            style={{
              backgroundColor: i < filledSegments ? segmentColors[i] : '#141430',
              boxShadow: i < filledSegments
                ? `0 0 8px ${segmentColors[i]}80`
                : 'none',
            }}
          />
        ))}
      </div>
      <p className="text-center text-[0.6875rem] text-[#7a7a9a] mt-2 uppercase">
        {currentProgress}% Complete
      </p>
    </div>
  )
}
