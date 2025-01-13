import React, { useState, useRef, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

interface AnimatedVolumeControlProps {
  volume: number
  onVolumeChange: (newVolume: number) => void
}

export const AnimatedVolumeControl: React.FC<AnimatedVolumeControlProps> = ({ volume, onVolumeChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const controlRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (controlRef.current && !controlRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div ref={controlRef} className="relative flex items-center">
      <div className="flex items-center">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 opacity-60 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-white/20 rounded-full"
            aria-label="Open volume control"
          >
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        ) : (
          <div className="flex items-center bg-black border border-white/20 rounded-lg px-3 py-2">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-[120px] accent-white [&::-webkit-slider-runnable-track]:h-[2px] [&::-webkit-slider-runnable-track]:bg-white/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 [&:hover::-webkit-slider-thumb]:scale-125"
            />
          </div>
        )}
      </div>
    </div>
  )
}

