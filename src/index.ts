import ytdl from 'ytdl-core'
import DiscordJS, { Client, VoiceChannel, Intents, Message } from 'discord.js';
import * as functions from './functions';
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
import dotenv from 'dotenv'
import { createDiscordJSAdapter } from './adapter'
import * as fs from 'fs'
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
    ping
} from './commands'

dotenv.config()

player.addListener('stateChange', () => {
    //if state.status == idle, pop queue, play next song
    if (player.state.status == AudioPlayerStatus.Idle) {
        functions.skipSong()
    }
    //else do nothing
})

client.on('ready', async () => {
    functions.makeMusicDirectory()
    const guild = client.guilds.cache.get(functions.getGuildEnv())
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
})

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isCommand()) {
        return
    }

    const {commandName, options} = interaction
    
    if (commandName === 'ping') {
        ping(interaction)
    }
    else if (commandName === 'play') {
        play(interaction, options)
    }

    else if(commandName == 'skip') {
        skip(interaction)
    }

    else if(commandName === 'purge') {
        purge(interaction)
    }

    else if(commandName == 'disconnect') {
        disconnect(interaction)
    }
})

let x:Promise<string> = client.login(process.env.TOKEN)