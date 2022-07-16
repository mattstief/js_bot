import ytdl from 'ytdl-core'
import DiscordJS from 'discord.js';
import {promisify} from 'util'
import {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	entersState,
	StreamType,
	AudioPlayerStatus,
	VoiceConnectionStatus,
    getVoiceConnection,
    AudioPlayer,
    AudioResource,
} from '@discordjs/voice'
import { createDiscordJSAdapter } from './adapter'
import * as fs from 'fs'
import {
    songQueue,
    songInfo,
    chunkQueue,
    title_length,
    chunkTime,
    ytdl_options,
    musicDir,
    tempDir,
    audioExt,
    player,
    client
} from './globals'
import { disconnect } from './commands'
import {exec} from 'child_process'

async function exitCallback() {
    //const voiceConnection = getVoiceConnection(getGuildEnv())
    disconnect()
    console.log("exiting")
    await client.destroy()
    process.exit(0)
}

async function connectToChannel(channel: DiscordJS.VoiceBasedChannel) {
    if (!channel) {
        console.log('Join a voice channel then try again!')
        return
    }
    console.log("channel found")
    try {
        const voice = await channel.fetch()
        if (voice.type != 'GUILD_VOICE') {
            return
        }
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id, 
            adapterCreator: createDiscordJSAdapter(voice),
        });
        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
            if (!connection) {
                return
            }
            let subscription = connection.subscribe(player)    //subscribe to the player
            return connection;
        } catch (error) {
            connection.destroy();
            throw error;
        }

    } catch (error) {
        console.error(error);
        return null
    }
}

async function downloadFromURL(url: string, fileName: string) {
    const a = ytdl(url, ytdl_options).pipe(fs.createWriteStream(musicDir + fileName))
    return a

}

function printVideoChapters(info: ytdl.videoInfo) {
    const chapters = info.videoDetails.chapters
    console.log("video has " + chapters.length + " chapters")
    for(const chapter of chapters) {
        console.log(chapter.title + chapter.start_time)
    }
}

function skipSong() {
    let currentSong = songQueue.shift()
    let currInfo = songInfo.shift()
    console.log("SHIFTING!")
    //check for multiple songs - rather than chunks
    if (songQueue.length > 0) {
        playSong(songQueue[0])
    }
    return currentSong
}

function skipChunk() {
    let currentChunk = chunkQueue.shift()
    console.log("SHIFTING!")
    //check for multiple songs - rather than chunks
    if (chunkQueue.length > 0) {
        playResource(chunkQueue[0])
    }
    return currentChunk
}

function getGuildEnv() {
    const guild = process.env.GUILD_ID
    if (guild == null) {
        console.log('No guild environment variable found. Exiting.')
        process.exit(1)
    }
    return guild
}

function playSong(fileName: string) {
    console.log("playing song " + fileName)
    console.log("songQueue length: " + songQueue.length)
    // console.log("songQueue: " + songQueue)
    const filePath:string = './' + musicDir + fileName
    try {
        //appendSongQueue(fileName)
        const resource = createAudioResource(filePath, {
            inputType: StreamType.Arbitrary
        })
        player.play(resource)
    }
    catch (error) {
        console.error(error);
    }
	return entersState(player, AudioPlayerStatus.Playing, 5e3);
}

function getResource(songPath:string){
    try {
        return createAudioResource(songPath, {
            inputType: StreamType.Opus
        })
    }
    catch (error) {
        console.error(error);
    }
    return null
}

function playResource(resource:AudioResource) {
    try {
        player.play(resource)
        const delay = 6
        const chunkms = (chunkTime * 1000) - delay 
        const x = resource.playStream.readableLength 
        //const durationMeta = resource?.edges
        //const durationMeta = resource?.
        //console.log("chunktime: ", durationMeta)
        //variation in exact timing is hard to predict. This is a hacky way to get around it - hardware dependent. 
        //This solution is "hot swapping" the chunk resource. Instead it should either 1) ensure that the chunk is 
        //depleted before the next chunk is played, or 
        //2) use a separate thread to play the chunks.
        //3) an empircal way to calculate the delay would work too. 
        setTimeout(skipChunk, chunkms)
        return entersState(player, AudioPlayerStatus.Playing, 100000)
    } catch (error) {
        console.error(error);
    }
}

function getFileName(info: ytdl.videoInfo, fileExt: string = audioExt, substring_len: number = title_length) {
    const title = info.videoDetails.title
    const titleDelimed = title.split(' ')
    let runningCount = 0
    let i = 0
    let fileName = ''
    while((runningCount < substring_len) && (i < titleDelimed.length)) {
        runningCount += titleDelimed[i].length
        fileName += titleDelimed[i]
        i++
    }
    const titleSubstr = title.substring(0, substring_len)
    fileName += fileExt
    return fileName
}

function makeDirectory(dirName:string|undefined) {
    if (dirName == null) {
        return
    }
    fs.mkdir(dirName, (err) => {
        if (err && err.code == 'EEXIST') {
        } else if (err){
            console.log(err.code)
        } else {
            console.log('path \"' + dirName + '\" not found. Created new directory.')
        }
    })
}

async function appendSongQueue(songName: string) {
    const fileExits:boolean = fs.existsSync(musicDir + songName)
    if (fileExits) {
        songQueue.push(songName)
    }
}

async function appendSongInfo(info: ytdl.videoInfo) {
    const validInfo:boolean = (info.videoDetails != null)
    if (validInfo) {
        songInfo.push(info)
    }
}

async function appendChunkQueue(dirName: string) {
    const songdir:string = dirName.split('.')[0] + '/'
    const dirPath:string = './' + musicDir + songdir
    console.log("dirPath: " + dirPath)
    fs.readdir(dirPath, (err, files) => {
        if (files != null) {
            for(const file of files) {
                const strPath:string = dirPath + file
                const resource:AudioResource|null = getResource(strPath)
                if (resource != null) {
                    const validResource:boolean = (resource.playStream.readable)
                    if (validResource) {
                        chunkQueue.push(resource)
                    }
                }
                else {
                    console.log("resource is null")
                }
            }
        }
        else{
            console.log("no files found in song dir")
        }
    })
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function createSilentAudioFile(duration:number, name:string) {
    // https://iqcode.com/code/javascript/run-command-line-using-javascript
    //console.log("name: " + name + ".flac")
    exec('rm temp/*.flac', (error, stdout, stderr) => {
        if(error){
            console.log(`error: ${error.message}`)
            return
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`)
            return
        }
        console.log(`stdout: ${stdout}`)
    })

    const command = 'ffmpeg -i src/silent_quarter-second.flac -af apad=pad_dur=' + duration + 's temp/' + name + '.flac'

    exec(command, (error, stdout, stderr) => {
        if(error){
            console.log(`error: ${error.message}`)
            return
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`)
            return
        }
        console.log(`stdout: ${stdout}`)
    })
    //run ffmpeg command to create a silent audio file of the given duration
    //do system call like this or use a library like ffmpeg-node
    //ffmpeg -i .\silent.flac -af apad=pad_dur=36000s .\silentlonger.flac
    if (typeof name === 'undefined') {
        name = 'none'
    }
    return name + duration
}

function chunkSong(fileName:string) {
    console.log("chunking song " + fileName)
    //`ffmpeg -i "input_audio_file.mp3" -f segment -segment_time 3600 -c copy output_audio_file_%03d.mp3`
    const chunksDir = fileName.split('.')[0] + '/'
    makeDirectory(musicDir + chunksDir)
    const input = './' + musicDir + fileName
    const output = './' + musicDir + chunksDir + '%03d' + audioExt
    //const command = 'ffmpeg -i ' + input + ' -f segment -segment_time ' + chunkTime + ' -c copy -shortest ' + output
    const command = 'ffmpeg -i ./' + musicDir + fileName + ' -f segment -segment_time ' + chunkTime + ' ./' + musicDir + chunksDir + '%03d' + audioExt
    const child = exec(command, (error, stdout, stderr) => {
        if(error){
            console.log(`error: ${error.message}`)
            return 
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`)
            return
        }
        console.log(`stdout: ${stdout}`)
    })
    return child
}

async function chunkByChapter(songFile:string, info:ytdl.videoInfo) {
    const chapters = info?.videoDetails?.chapters
    if (chapters.length > 0) {
        console.log("chapters found")
        let processes:Promise<unknown>[] = [] //array of child processes
        const sourceMusic:string = './' + musicDir + songFile
        //split song into chunks by chapter
        for (let j = 0; j < chapters.length; j++) {
            const chapterName:string = chapters[j].title
            const chapterStart:number = chapters[j].start_time

            let chapterEnd:number
            //if last chapter, end time is end of source video
            if (j >= (chapters.length - 1)) {
                chapterEnd = parseInt(info?.videoDetails?.lengthSeconds)
                console.log("last chapter: " + chapterEnd)
            }
            else {
                chapterEnd = chapters[j + 1]?.start_time
            }

            // const chapterFileName = chapterName.replace(' ', '') + audioExt

            //TODO make function for name formatting
            let chapterFileName:string = chapterName.trim()
            while(chapterFileName.includes(' ')) {
                chapterFileName = chapterFileName.replace(' ', '_')
            }
            chapterFileName = chapterFileName + audioExt

            const chapterPath:string = './' + musicDir + chapterFileName
            const chapterCommand:string = 'ffmpeg -i ' + sourceMusic + ' -ss ' + chapterStart + ' -t ' + (chapterEnd-chapterStart) + ' ' + chapterPath

            const child = promisify(() => exec(chapterCommand, (error, stdout, stderr) => {
                if(error){
                    console.log(`error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    //console.log(`stderr: ${stderr}`);
                    // return;
                }
                //console.log(`stdout: ${stdout}`);
                return
                //TODO appendSongQueue after child process finishes
            }))            
            processes.push(child())
            appendSongQueue(chapterFileName)
        }
        return processes
    }
    else{
         //TODO else add the song to the song queue
        appendSongQueue(songFile)
        console.log("chapters not found")
        return []
    }
}

//export all functions
export {
    exitCallback,
    connectToChannel,
    downloadFromURL,
    printVideoChapters,
    skipSong,
    skipChunk,
    getGuildEnv,
    playSong,
    playResource,
    getResource,
    makeDirectory,
    appendSongQueue,
    appendSongInfo,
    appendChunkQueue,
	getFileName,
    sleep,
    createSilentAudioFile,
    chunkSong,
    chunkByChapter,
}