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

let songQueue: Array<string> = []

const title_length  : number = 10
const ytdl_options  : ytdl.downloadOptions = {filter: 'audioonly'}
const musicDir      : string = 'music/'
const player = createAudioPlayer()
const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_VOICE_STATES,
    ]
})

//export all const variables in file
export {
	songQueue,
	title_length,
	ytdl_options,
	musicDir,
	player,
	client
}