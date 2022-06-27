import ytdl from 'ytdl-core'
import DiscordJS from 'discord.js';
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
} from '@discordjs/voice'
import { createDiscordJSAdapter } from './adapter'
import * as fs from 'fs'
import {
    songQueue,
    title_length,
    ytdl_options,
    musicDir,
    tempDir,
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
    a.on('finish', () => { 
        console.log('download \"' + fileName + '\" finished') 
        return
    })
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
    console.log("SHIFTING!")
    if (songQueue.length > 0) {
        playSong(songQueue[0])
    }
    return currentSong
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
    console.log("playing song" + fileName)
    try {
        const songPath = './music/' + fileName
        const resource = createAudioResource(songPath, {
            inputType: StreamType.Raw
        })
        //LAVAPLAYER https://github.com/sgoudham-university/Winston-Bot/blob/43e23e51ad806c31074545a25740579c0e8f0111/src/main/java/me/goudham/winston/bot/command/music/FastForward.java

        //const readableEnc = resource.playStream.readableEncoding
        //console.log("readableEnc: " + readableEnc)


        //console log all event names for resource.playStream
        // const eventNames = resource.playStream.eventNames()
        // for(const eventName of eventNames) {
        //     console.log(eventName)
        // }

        const edges = resource.edges
        for (const edge of edges) {
            console.log(edge)
        }

        //resource.read() //read an opus packet
        player.play(resource)
    }
    catch (error) {
        console.error(error);
    }
	return entersState(player, AudioPlayerStatus.Playing, 5e3);
}

function getFileName(info: ytdl.videoInfo, fileExt: string = 'm4a', substring_len: number = title_length) {
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
    fileName += '.' + fileExt
    return fileName
}

function makeMusicDirectory() {
    fs.mkdir(musicDir, (err) => {
        if (err && err.code == 'EEXIST') {
            //music directory already exists
        } else if (err){
            console.log(err.code)
        } else {
            console.log('path \"' + musicDir + '\" not found. Created new directory.')
        }
    })
}

function makeTempDirectory() {
    fs.mkdir(tempDir, (err) => {
        if (err && err.code == 'EEXIST') {
        } else if (err){
            console.log(err.code)
        } else {
            console.log('path \"' + tempDir + '\" not found. Created new directory.')
        }
    })
}

function appendSongQueue(fileName: string) {
    console.log("filename: " + fileName)
    const fileExits:boolean = fs.existsSync(musicDir + fileName)
    songQueue.push(fileName)
    console.log("song queue: " + songQueue)
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

//export all functions
export {
    exitCallback,
    connectToChannel,
    downloadFromURL,
    printVideoChapters,
    skipSong,
    getGuildEnv,
    playSong,
    makeMusicDirectory,
    makeTempDirectory,
    appendSongQueue,
	getFileName,
    sleep,
    createSilentAudioFile
}