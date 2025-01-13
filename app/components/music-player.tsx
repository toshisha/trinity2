'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat } from 'lucide-react'
import Image from 'next/image'
import { AnimatedVolumeControl } from './animated-volume-control'

interface Track {
  id: number
  title: string
  artist: string
  duration: number
  url: string
}

export default function MusicPlayer() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [volume, setVolume] = useState(1)
  const [isShuffled, setIsShuffled] = useState(false)
  const [isAutoplay, setIsAutoplay] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/tracks')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setTracks(data)
        } else {
          console.error('Invalid data format received')
          setTracks([])
        }
      })
      .catch(error => {
        console.error('Error fetching tracks:', error)
        setTracks([])
      })
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      const updateProgress = () => {
        setCurrentTime(audioRef.current!.currentTime);
      };
      audioRef.current.addEventListener('timeupdate', updateProgress);
      return () => {
        audioRef.current?.removeEventListener('timeupdate', updateProgress);
      };
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const shuffleArray = useCallback((array: Track[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [])

  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => !prev)
    setTracks(prev => isShuffled ? [...prev].sort((a, b) => a.id - b.id) : shuffleArray(prev))
  }, [isShuffled, shuffleArray])

  const toggleAutoplay = useCallback(() => {
    setIsAutoplay(prev => !prev)
  }, [])

  const playTrack = useCallback((track: Track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    if (audioRef.current) {
      audioRef.current.src = track.url
      audioRef.current.play()
    }
  }, [])

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
    if (!currentTrack || tracks.length === 0) return
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id)
    let nextIndex
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * tracks.length)
    } else {
      nextIndex = (currentIndex + 1) % tracks.length
    }
    playTrack(tracks[nextIndex])
  }, [currentTrack, tracks, isShuffled, playTrack])

  const playPrevious = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id)
    let previousIndex
    if (isShuffled) {
      previousIndex = Math.floor(Math.random() * tracks.length)
    } else {
      previousIndex = (currentIndex - 1 + tracks.length) % tracks.length
    }
    playTrack(tracks[previousIndex])
  }, [currentTrack, tracks, isShuffled, playTrack])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !currentTrack || !audioRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    const percentage = x / width
    const newTime = percentage * (currentTrack.duration || 0)
    
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }, [currentTrack])

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

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 py-2 sm:h-16 border-b border-white/10">
        <div className="w-full sm:w-auto flex justify-center sm:justify-start mb-2 sm:mb-0">
          <Image
            src="/logo.svg"
            alt="MAFWBH logo"
            width={154}
            height={40}
            priority
          />
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
          <div className="grid grid-cols-[48px_1fr_1fr_80px] gap-3 text-sm opacity-60 px-4 py-2 border-b border-white/10">
            <div className="text-center">#</div>
            <div>Title</div>
            <div>Artist</div>
            <div className="text-right pr-2">Duration</div>
          </div>

          {filteredTracks.length === 0 ? (
            <div className="text-center py-8 opacity-60">
              <p className="text-sm">No songs found</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredTracks.map((track, index) => (
                <button
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={`w-full grid grid-cols-[48px_1fr_1fr_80px] gap-3 text-sm px-4 py-2 hover:bg-white/5 transition-colors items-center ${
                    currentTrack?.id === track.id ? 'bg-white/5' : ''
                  }`}
                >
                  <div className="text-center opacity-60">{index + 1}</div>
                  <div className="text-left truncate">{track.title}</div>
                  <div className="text-left opacity-60 truncate">{track.artist}</div>
                  <div className="text-right opacity-60 pr-2">
                    {formatTime(track.duration)}
                  </div>
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
              <span>{currentTrack ? formatTime(currentTrack.duration) : '0:00'}</span>
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
                className={`p-2 transition-opacity ${isShuffled ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button 
                onClick={playPrevious}
                className="p-2 opacity-60 hover:opacity-100 transition-opacity"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <button 
                onClick={playNext}
                className="p-2 opacity-60 hover:opacity-100 transition-opacity"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button 
                onClick={toggleAutoplay}
                className={`p-2 transition-opacity ${isAutoplay ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
              >
                <Repeat className="w-5 h-5" />
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
    </div>
  )
}

