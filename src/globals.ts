import ytdl from 'ytdl-core'
import DiscordJS, {Intents} from 'discord.js'
import {createAudioPlayer} from '@discordjs/voice'
import dotenv from 'dotenv'

dotenv.config()

let songQueue: Array<string> = []

const title_length  : number = 10
const ytdl_options  : ytdl.downloadOptions = {filter: 'audioonly'}
const musicDir      : string = 'music/'
const tempDir       : string = 'temp/'
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
    tempDir,
	player,
	client
}