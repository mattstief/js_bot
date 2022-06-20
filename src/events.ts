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
} from '@discordjs/voice'
import {
    connectToChannel,
    downloadFromURL,
    skipSong,
    getGuildEnv,
    playSong,
    makeMusicDirectory,
    appendSongQueue,
	getFileName,
    sleep
} from './functions'
import {
    songQueue,
    title_length,
    ytdl_options,
    musicDir,
    player,
    client
} from './globals'
import {
    disconnect,
	purge,
	skip, 
	play,
    ping,
    pause,
    resume
} from './commands'

async function stateEvent() {
    if (player.state.status == AudioPlayerStatus.Idle) {
        skipSong()
    }
    //else do nothing
}

async function readyEvent() {
    try {    
        makeMusicDirectory()
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