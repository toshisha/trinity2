"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Search, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Music } from "lucide-react"
import Image from "next/image"
import { AnimatedVolumeControl } from "./animated-volume-control"

interface Track {
  id: number
  title: string
  artist: string
  duration: number
  url: string
  coverArt: string | null
}

export default function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [originalTracks, setOriginalTracks] = useState<Track[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [volume, setVolume] = useState(1)
  const [isShuffled, setIsShuffled] = useState(false)
  const [isAutoplay, setIsAutoplay] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const [crossfadeDuration, setCrossfadeDuration] = useState(3) // 3 seconds default
  const [isCrossfadeEnabled, setIsCrossfadeEnabled] = useState(true)
  const [nextTrack, setNextTrack] = useState<Track | null>(null)
  const [shuffleQueue, setShuffleQueue] = useState<Track[]>([])
  const [shuffleIndex, setShuffleIndex] = useState(0)
  const nextAudioRef = useRef<HTMLAudioElement | null>(null)
  const crossfadeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        const res = await fetch("/api/tracks")
        if (!res.ok) throw new Error("Failed to fetch tracks")
        const data = await res.json()
        if (!Array.isArray(data)) throw new Error("Invalid data format")
        setTracks(data)
        setOriginalTracks(data)
        setError(null)
      } catch (err) {
        console.error("Error fetching tracks:", err)
        setError("Failed to load tracks. Please try again later.")
        setTracks([])
        setOriginalTracks([])
      }
    }

    fetchTracks()
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      const updateProgress = () => {
        setCurrentTime(audioRef.current!.currentTime)
      }
      audioRef.current.addEventListener("timeupdate", updateProgress)
      return () => {
        audioRef.current?.removeEventListener("timeupdate", updateProgress)
      }
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const filteredTracks = tracks.filter(
    (track) =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const shuffleArray = useCallback((array: Track[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [])

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => {
      const newShuffled = !prev

      if (newShuffled) {
        // Enable shuffle: create shuffled version
        const shuffled = shuffleArray(originalTracks)
        setTracks(shuffled)
        setShuffleQueue(shuffled)
        setShuffleIndex(0)
      } else {
        // Disable shuffle: restore original order
        setTracks(originalTracks)
        setShuffleQueue([])
        setShuffleIndex(0)
      }

      return newShuffled
    })
  }, [shuffleArray, originalTracks])

  const getNextTrack = useCallback(
    (current: Track | null = currentTrack): Track | null => {
      if (!current || tracks.length === 0) return null

      if (isShuffled && shuffleQueue.length > 0) {
        const nextIndex = (shuffleIndex + 1) % shuffleQueue.length
        return shuffleQueue[nextIndex] || null
      } else {
        const currentIndex = tracks.findIndex((track) => track.id === current.id)
        const nextIndex = (currentIndex + 1) % tracks.length
        return tracks[nextIndex] || null
      }
    },
    [currentTrack, tracks, isShuffled, shuffleQueue, shuffleIndex],
  )

  const preloadNextTrack = useCallback(() => {
    const next = getNextTrack()
    setNextTrack(next)

    if (next && nextAudioRef.current) {
      nextAudioRef.current.src = next.url
      nextAudioRef.current.load()
    }
  }, [getNextTrack])

  const playTrack = useCallback(
    (track: Track, skipCrossfade = false) => {
      // Clear any existing crossfade timeout
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current)
      }

      setCurrentTrack(track)
      setIsPlaying(true)

      if (audioRef.current) {
        if (!skipCrossfade && isCrossfadeEnabled && currentTrack && audioRef.current.src) {
          // Start crossfade transition
          const currentAudio = audioRef.current
          const nextAudio = nextAudioRef.current

          if (nextAudio && nextAudio.src === track.url) {
            // Use preloaded track
            nextAudio.volume = 0
            nextAudio.currentTime = 0
            nextAudio.play()

            // Crossfade
            const fadeSteps = 20
            const fadeInterval = (crossfadeDuration * 1000) / fadeSteps
            let step = 0

            const fadeInterval_id = setInterval(() => {
              step++
              const progress = step / fadeSteps

              currentAudio.volume = volume * (1 - progress)
              nextAudio.volume = volume * progress

              if (step >= fadeSteps) {
                clearInterval(fadeInterval_id)
                currentAudio.pause()
                currentAudio.volume = volume

                // Swap audio references
                const tempRef = audioRef.current
                audioRef.current = nextAudioRef.current
                nextAudioRef.current = tempRef
              }
            }, fadeInterval)
          } else {
            // Fallback to normal play
            audioRef.current.src = track.url
            audioRef.current.volume = volume
            audioRef.current.play()
          }
        } else {
          // Normal play without crossfade
          audioRef.current.src = track.url
          audioRef.current.volume = volume
          audioRef.current.play()
        }
      }

      // Update shuffle index if in shuffle mode
      if (isShuffled && shuffleQueue.length > 0) {
        const trackIndex = shuffleQueue.findIndex((t) => t.id === track.id)
        if (trackIndex !== -1) {
          setShuffleIndex(trackIndex)
        }
      }

      // Preload next track after a short delay
      setTimeout(preloadNextTrack, 1000)
    },
    [currentTrack, volume, crossfadeDuration, isCrossfadeEnabled, isShuffled, shuffleQueue, preloadNextTrack],
  )

  const togglePlay = useCallback(() => {
    if (!currentTrack) return
    if (isPlaying) {
      audioRef.current?.pause()
    } else {
      audioRef.current?.play()
    }
    setIsPlaying(!isPlaying)
  }, [currentTrack, isPlaying])

  const playNext = useCallback(() => {
    const next = getNextTrack()
    if (next) {
      playTrack(next)
    }
  }, [getNextTrack, playTrack])

  const playPrevious = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return

    let previousTrack: Track | null = null

    if (isShuffled && shuffleQueue.length > 0) {
      // In shuffle mode, go to previous in shuffle queue
      const prevIndex = shuffleIndex - 1 >= 0 ? shuffleIndex - 1 : shuffleQueue.length - 1
      previousTrack = shuffleQueue[prevIndex]
      setShuffleIndex(prevIndex)
    } else {
      const currentIndex = tracks.findIndex((track) => track.id === currentTrack.id)
      const previousIndex = (currentIndex - 1 + tracks.length) % tracks.length
      previousTrack = tracks[previousIndex]
    }

    if (previousTrack) {
      playTrack(previousTrack, true) // Skip crossfade for previous
    }
  }, [currentTrack, tracks, isShuffled, shuffleQueue, shuffleIndex, playTrack])

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!progressRef.current || !currentTrack || !audioRef.current) return

      const rect = progressRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const width = rect.width
      const percentage = x / width
      const newTime = percentage * (currentTrack.duration || 0)

      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    },
    [currentTrack],
  )

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume)
  }, [])

  const handleTrackEnd = useCallback(() => {
    if (isAutoplay) {
      playNext()
    } else {
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [isAutoplay, playNext])

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay((prev) => !prev)
  }, [])

  // Setup crossfade trigger
  useEffect(() => {
    if (!audioRef.current || !currentTrack || !isCrossfadeEnabled) return

    const audio = audioRef.current
    const handleTimeUpdate = () => {
      const timeLeft = audio.duration - audio.currentTime

      if (timeLeft <= crossfadeDuration && timeLeft > crossfadeDuration - 0.1 && isAutoplay) {
        // Start crossfade
        const next = getNextTrack()
        if (next && nextAudioRef.current && !crossfadeTimeoutRef.current) {
          crossfadeTimeoutRef.current = setTimeout(() => {
            if (nextAudioRef.current && next) {
              nextAudioRef.current.src = next.url
              nextAudioRef.current.volume = 0
              nextAudioRef.current.currentTime = 0
              nextAudioRef.current.play()

              // Start fade
              const fadeSteps = 20
              const fadeInterval = (crossfadeDuration * 1000) / fadeSteps
              let step = 0

              const fadeInterval_id = setInterval(() => {
                step++
                const progress = step / fadeSteps

                if (audioRef.current) audioRef.current.volume = volume * (1 - progress)
                if (nextAudioRef.current) nextAudioRef.current.volume = volume * progress

                if (step >= fadeSteps) {
                  clearInterval(fadeInterval_id)
                  // The track will end naturally and trigger handleTrackEnd
                }
              }, fadeInterval)
            }
          }, 100)
        }
      }
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current)
        crossfadeTimeoutRef.current = null
      }
    }
  }, [currentTrack, crossfadeDuration, isCrossfadeEnabled, isAutoplay, volume, getNextTrack])

  // Minimalist crossfade icon component
  const CrossfadeIcon = ({ className }: { className?: string }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12h6l3-9 3 9h6" />
      <path d="M21 12h-6l-3 9-3-9H3" opacity="0.5" />
    </svg>
  )

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 py-2 sm:h-16 border-b border-white/10">
        <div className="w-full sm:w-auto flex justify-center sm:justify-start mb-2 sm:mb-0">
          <Image src="/logo.svg" alt="MAFWBH logo" width={120} height={40} priority />
        </div>
        <div className="relative w-full sm:w-64 md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs..."
            className="w-full pl-10 py-2 bg-black border border-white/10 text-white text-sm placeholder:text-white/60 focus:outline-none rounded-md"
          />
        </div>
      </header>

      <div className="flex-1 p-4 overflow-hidden pb-36">
        <div className="border border-white/10 rounded-md h-full flex flex-col">
          <div className="grid grid-cols-[48px_48px_1fr_1fr_80px] gap-3 text-xs font-medium text-white/60 px-4 py-2 border-b border-white/10">
            <div className="text-center">#</div>
            <div></div>
            <div>Title</div>
            <div>Artist</div>
            <div className="text-right pr-2">Duration</div>
          </div>

          {filteredTracks.length === 0 ? (
            <div className="text-center py-8 opacity-60">
              {error ? <p className="text-sm">{error}</p> : <p className="text-sm">No songs found</p>}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredTracks.map((track, index) => (
                <button
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={`w-full grid grid-cols-[48px_48px_1fr_1fr_80px] gap-3 text-xs px-4 py-1.5 hover:bg-white/5 transition-colors items-center ${
                    currentTrack?.id === track.id ? "bg-white/5" : ""
                  }`}
                >
                  <div className="text-center text-white/60">{index + 1}</div>
                  <div className="flex items-center justify-center">
                    {track.coverArt ? (
                      <Image
                        src={track.coverArt || "/placeholder.svg"}
                        alt={`Cover for ${track.title}`}
                        width={32}
                        height={32}
                        className="rounded-sm"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-white/10 rounded-sm flex items-center justify-center">
                        <Music className="w-4 h-4 text-white/60" />
                      </div>
                    )}
                  </div>
                  <div className="text-left truncate">{track.title}</div>
                  <div className="text-left text-white/60 truncate">{track.artist}</div>
                  <div className="text-right text-white/60 pr-2">{formatTime(track.duration)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60 p-4">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-2">
          <div className="w-full flex flex-col gap-1">
            <div className="w-full flex justify-between text-[10px] text-white/60">
              <span>{formatTime(currentTime)}</span>
              <span>{currentTrack ? formatTime(currentTrack.duration) : "0:00"}</span>
            </div>
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              className="w-full bg-white/10 h-[2px] rounded-full overflow-hidden cursor-pointer relative"
            >
              <div
                className="bg-white h-full transition-all duration-100 ease-linear"
                style={{ width: `${((currentTime / (currentTrack?.duration || 1)) * 100).toFixed(2)}%` }}
              />
            </div>
          </div>

          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="w-full sm:w-1/3 flex items-center justify-center sm:justify-start">
              {currentTrack && (
                <div className="truncate text-center sm:text-left">
                  <div className="font-medium truncate">{currentTrack.title}</div>
                  <div className="text-sm opacity-60 truncate">{currentTrack.artist}</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={`p-2 transition-opacity ${isShuffled ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                title={`Shuffle ${isShuffled ? "enabled" : "disabled"}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button onClick={playPrevious} className="p-2 opacity-60 hover:opacity-100 transition-opacity">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={togglePlay} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={playNext} className="p-2 opacity-60 hover:opacity-100 transition-opacity">
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={toggleAutoplay}
                className={`p-2 transition-opacity ${isAutoplay ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                title={`Autoplay ${isAutoplay ? "enabled" : "disabled"}`}
              >
                <Repeat className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsCrossfadeEnabled((prev) => !prev)}
                className={`p-2 transition-opacity ${isCrossfadeEnabled ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                title={`Crossfade ${isCrossfadeEnabled ? "enabled" : "disabled"}`}
              >
                <CrossfadeIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full sm:w-1/3 flex items-center justify-center sm:justify-end">
              <AnimatedVolumeControl volume={volume} onVolumeChange={handleVolumeChange} />
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={handleTrackEnd}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <audio ref={nextAudioRef} preload="none" />
    </div>
  )
}
