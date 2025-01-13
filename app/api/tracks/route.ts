import { readdir, stat, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NextResponse } from 'next/server'
import { parseBuffer } from 'music-metadata'

export async function GET() {
  try {
    const musicDir = join(process.cwd(), 'public', 'music')
    const files = await readdir(musicDir)
    const musicFiles = files.filter(file => /\.(mp3|flac|wav|aac)$/i.test(file))

    const tracks = await Promise.all(
      musicFiles.map(async (file, index) => {
        const filePath = join(musicDir, file)
        try {
          const buffer = await readFile(filePath)
          const metadata = await parseBuffer(buffer)
          const { common, format } = metadata
          
          let coverArt = null
          if (common.picture && common.picture.length > 0) {
            const { data, format: imageFormat } = common.picture[0]
            const base64 = Buffer.from(data).toString('base64')
            coverArt = `data:${imageFormat};base64,${base64}`
          }

          return {
            id: index + 1,
            title: common.title || file.replace(/\.(mp3|flac|wav|aac)$/i, ''),
            artist: common.artist || 'Unknown Artist',
            duration: Math.round(format.duration || 0),
            url: `/music/${file}`,
            coverArt
          }
        } catch (error) {
          console.error(`Error parsing metadata for ${file}:`, error)
          // Fallback to filename-based metadata if parsing fails
          const nameWithoutExt = file.replace(/\.(mp3|flac|wav|aac)$/i, '')
          const [artist, title] = nameWithoutExt.includes(' - ') 
            ? nameWithoutExt.split(' - ')
            : ['Unknown Artist', nameWithoutExt]
          
          return {
            id: index + 1,
            title: title.trim(),
            artist: artist.trim(),
            duration: 0,
            url: `/music/${file}`,
            coverArt: null
          }
        }
      })
    )

    return NextResponse.json(tracks)
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Failed to read music directory' }, { status: 500 })
  }
}

