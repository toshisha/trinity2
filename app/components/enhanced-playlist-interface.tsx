'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface Track {
  id: number
  title: string
  artist: string
  duration: number
  url: string
}

export default function EnhancedPlaylistInterface() {
  const [tracks, setTracks] = useState<Track[]>([])
  useEffect(() => {
    fetch('/api/tracks')
      .then(res => res.json())
      .then(data => setTracks(data))
      .catch(console.error)
  }, [])

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [volume, setVolume] = useState([75])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100
    }
  }, [volume])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleTrackSelect = (track: Track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    if (audioRef.current) {
      audioRef.current.src = track.url
      audioRef.current.play()
    }
  }

  const togglePlayPause = () => {
    if (!currentTrack) return
    if (isPlaying) {
      audioRef.current?.pause()
    } else {
      audioRef.current?.play()
    }
    setIsPlaying(!isPlaying)
  }

  const playNext = () => {
    if (!currentTrack) return
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id)
    const nextTrack = tracks[currentIndex + 1] || tracks[0]
    handleTrackSelect(nextTrack)
  }

  const playPrevious = () => {
    if (!currentTrack) return
    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id)
    const previousTrack = tracks[currentIndex - 1] || tracks[tracks.length - 1]
    handleTrackSelect(previousTrack)
  }

  return (
    <div className="flex flex-col h-screen bg-background dark">
      <div className="p-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 text-sm font-medium text-muted-foreground px-4 py-2">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Title</div>
            <div className="col-span-4">Artist</div>
            <div className="col-span-2 text-right">Duration</div>
          </div>

          <div className="space-y-1">
            {filteredTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => handleTrackSelect(track)}
                className={cn(
                  "w-full grid grid-cols-12 text-sm px-4 py-2 hover:bg-accent rounded-md transition-colors",
                  currentTrack?.id === track.id && "bg-accent text-accent-foreground",
                  "hover:text-accent-foreground"
                )}
              >
                <div className="col-span-1">{track.id}</div>
                <div className="col-span-5 text-left">{track.title}</div>
                <div className="col-span-4 text-left text-muted-foreground">{track.artist}</div>
                <div className="col-span-2 text-right text-muted-foreground">
                  {formatTime(track.duration)}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="p-4 space-y-4">
          <Slider
            value={[currentTime]}
            max={currentTrack?.duration || 100}
            step={1}
            className="cursor-pointer"
            onValueChange={(value) => {
              if (audioRef.current) {
                audioRef.current.currentTime = value[0]
                setCurrentTime(value[0])
              }
            }}
          />

          <div className="flex justify-between items-center">
            <div className="w-1/3">
              {currentTrack && (
                <div className="text-sm">
                  <div className="font-medium">{currentTrack.title}</div>
                  <div className="text-muted-foreground">{currentTrack.artist}</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {}}
                className="text-muted-foreground hover:text-foreground"
              >
                <Shuffle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={playPrevious}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlayPause}
                className="text-muted-foreground hover:text-foreground"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={playNext}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {}}
                className="text-muted-foreground hover:text-foreground"
              >
                <Repeat className="h-5 w-5" />
              </Button>
            </div>

            <div className="w-1/3 flex justify-end items-center gap-2">
              <Volume2 className="h-5 w-5 text-muted-foreground" />
              <Slider
                value={volume}
                max={100}
                step={1}
                className="w-32"
                onValueChange={setVolume}
              />
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={playNext}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  )
}

