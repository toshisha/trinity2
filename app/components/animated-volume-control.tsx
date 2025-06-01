"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Volume2, VolumeX, Volume1 } from "lucide-react"

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

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="w-5 h-5" />
    if (volume < 0.5) return <Volume1 className="w-5 h-5" />
    return <Volume2 className="w-5 h-5" />
  }

  const volumePercentage = Math.round(volume * 100)

  return (
    <div ref={controlRef} className="relative flex items-center">
      <div className="flex items-center">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="group p-2 opacity-60 hover:opacity-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 rounded-full hover:bg-white/5"
            aria-label="Open volume control"
          >
            {getVolumeIcon()}
          </button>
        ) : (
          <div className="flex items-center bg-black/90 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onVolumeChange(volume === 0 ? 0.5 : 0)}
                className="opacity-60 hover:opacity-100 transition-opacity"
                aria-label={volume === 0 ? "Unmute" : "Mute"}
              >
                {getVolumeIcon()}
              </button>

              <div className="relative flex items-center gap-3">
                <div className="relative w-32 h-2">
                  <div className="absolute inset-0 bg-white/10 rounded-full"></div>
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-white/60 to-white rounded-full transition-all duration-150"
                    style={{ width: `${volumePercentage}%` }}
                  ></div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => onVolumeChange(Number.parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Volume slider"
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-white/20 transition-all duration-150 hover:scale-110 cursor-pointer"
                    style={{
                      left: `calc(${volumePercentage}% - 8px)`,
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                    }}
                  />
                </div>

                <div className="text-xs font-medium text-white/80 min-w-[2rem] text-center">{volumePercentage}%</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
