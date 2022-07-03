import ytdl from 'ytdl-core'
import DiscordJS, {Intents} from 'discord.js'
import {AudioResource, createAudioPlayer} from '@discordjs/voice'
import dotenv from 'dotenv'

dotenv.config()

let songQueue: Array<string> = []
let chunkQueue: Array<AudioResource> = []

const title_length  : number = 10
const chunkTime : number = 10
const ytdl_options  : ytdl.downloadOptions = {filter: 'audioonly'}
const musicDir      : string = 'music/'
const tempDir       : string = 'temp/'
const audioExt      : string = '.mp4'
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
    chunkQueue,
	title_length,
    chunkTime,
	ytdl_options,
	musicDir,
    tempDir,
    audioExt,
	player,
	client
}