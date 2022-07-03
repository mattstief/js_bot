import DiscordJS from 'discord.js'
import {addExitCallback} from 'catch-exit'
import {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	entersState,
	StreamType,
	AudioPlayerStatus,
	VoiceConnectionStatus,
    getVoiceConnection,
} from '@discordjs/voice'
import {
    exitCallback,
    connectToChannel,
    downloadFromURL,
    skipSong,
    getGuildEnv,
    playSong,
    makeDirectory,
    appendSongQueue,
	getFileName,
    sleep,
    createSilentAudioFile,
    skipChunk
} from './functions'
import {
    songQueue,
    title_length,
    ytdl_options,
    musicDir,
    player,
    client,
    tempDir,
    chunkQueue
} from './globals'
import {
    disconnect,
	purge,
	skip, 
	play,
    ping,
    pause,
    resume,
    seek,
    test
} from './commands'

addExitCallback((signal) => {
    console.log(`Exiting with signal ${signal}`)
    if (player.state.status == AudioPlayerStatus.Playing) {
        player.stop()
    }
    // if (client.voice)
    //if connected to a voice channel, disconnect
    // if (VoiceConnectionStatus == VoiceConnectionStatus.Connected) {
    //     getVoiceConnection. disconnect()
    // }
})

async function stateEvent() {
    switch(player.state.status) {
        case AudioPlayerStatus.Playing:
            console.log("playing")
            break;
        case AudioPlayerStatus.Paused:
            console.log("paused")
            break;
        case AudioPlayerStatus.AutoPaused:
            console.log("autopaused")
            break;
        case AudioPlayerStatus.Buffering:
            console.log("buffering")
            break;
        case AudioPlayerStatus.Idle:
            console.log("idle")
            // if (songQueue.length > 0) {
            //     skipSong()
            // }
            // if (chunkQueue.length > 0) {
            //     skipChunk()
            //     console.log("chonkers: " + chunkQueue.length)
            // }
            break;
        //case AudioPlayerStatus.Error || AudioPlayerStatus.Disconnected:
    }
}

async function readyEvent() {
    try {    
        makeDirectory(musicDir)
        makeDirectory(tempDir)
        const guild = client.guilds.cache.get(getGuildEnv())
        let commands
        if (guild) {
            //console.log('guild found')
            commands = guild.commands
        } else {
            //console.log('no guild found')
            commands = client.application?.commands
        }
        console.log('ready!')

        commands?.create({
            name: 'ping',
            description: 'ping'
        })

        commands?.create({
            name: 'purge',
            description: 'deletes all downloaded songs'
        })

        commands?.create({
            name: 'disconnect',
            description: 'disconnects from voice chat'
        })

        commands?.create({
            name: 'skip',
            description: 'skips current song',
            
        })
        
        commands?.create({
            name: 'pause',
            description: 'pauses current song',
        })

        commands?.create({
            name: 'resume',
            description: 'resumes a paused song',
        })

        commands?.create({
            name: 'seek',
            description: 'seeks to a specific time in the song',
        })

        commands?.create({
            name: 'test',
            description: 'debug',
            options: [
                {
                    name: 'number',
                    description: 'arbitraty number',
                    required: true,
                    type: DiscordJS.Constants.ApplicationCommandOptionTypes.NUMBER
                },
                {
                    name: 'string',
                    description: 'arbitraty string',
                    required: true,
                    type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING
                }
            ]
        })

        commands?.create({
            name: 'play',
            type: 1,
            description: 'plays a song via link or name',
            options: [
                {
                    name: 'link_or_name',
                    description: 'the link or name of the song',
                    required: true,
                    type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
                }
            ]
        })
    }   catch (error) {
        console.log(error)
    }
}

async function interactionEvent(interaction:DiscordJS.Interaction<DiscordJS.CacheType>) {
    try {
        if(!interaction.isCommand()) {
            return
        }
        const {commandName, options} = interaction
        switch (commandName) {
            case 'ping':
                ping(interaction)
                break
            case 'purge':
                purge(interaction)
                break
            case 'disconnect':
                disconnect(interaction)
                break
            case 'skip':
                skip(interaction)
                break
            case 'play':
                play(interaction, options)
                break
            case 'pause':
                pause(interaction)
                break
            case 'resume':
                resume(interaction)
                break
            case 'seek':
                seek(interaction)
                break
            case 'test':
                test(interaction, options)
                break
            default:
                console.log("unknown command")
                break
        }
    }   catch (error) {
        console.log(error)
    }
}

export {
    stateEvent,
    readyEvent,
    interactionEvent
}