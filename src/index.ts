import DiscordJS, { Client, VoiceChannel, Intents, Message } from 'discord.js';
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
import { SlashCommandBuilder } from '@discordjs/builders';
import dotenv from 'dotenv'
import ytdl from 'ytdl-core'
import { createDiscordJSAdapter } from './adapter'
import * as fs from 'fs'

var ffmetadata = require("ffmetadata");

const title_length  : number = 10
const ytdl_options  : ytdl.downloadOptions = {filter: 'audioonly'}
const musicDir      : string = 'music/'

dotenv.config()

const player = createAudioPlayer();

const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_VOICE_STATES,
    ]
})

client.on('ready', async () => {
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
        interaction.reply ({
            content: 'pongers',
            ephemeral: false
        })
    }
    else if (commandName === 'play') {
        //console.log("play command received") 
        if (interaction.member) {
            //console.log("member present")
        }
        const userGuild = client.guilds.cache.get(getGuildEnv())
        const members = await userGuild?.members
        if (!members || !userGuild?.memberCount) {
            return
        }
        const vc = (await members.fetch(interaction.user.id)).voice.channel
        if (!vc) {
            return
        }

        const playArg = options.get('link_or_name')
        //console.log(playArg)
        if (playArg == null) {
            return
        }
        if (!playArg.value || typeof(playArg.value) != 'string') {
            return
        }
        const URL = playArg.value
        //console.log(URL)
        const isValidLink:boolean = ytdl.validateURL(URL)
        //console.log("valid link: ", isValidLink)
        if (isValidLink) {  //download it, then play to vc
            //TODO check if link has already been downloaded before attempting download
            let fileName
            ytdl.getInfo(URL).then(async info => {
                fileName = getFileName(info)
                downloadFromURL(URL, fileName)
                try {
                    const connection = await connectToChannel(vc)
                    if (!connection) {
                        return
                    }
                    if (!fileName) {
                        console.log("no file name")
                        return
                    }
                    await playSong(fileName);
                    //console.log('Song is ready to play!');
                    //console.log('Playing now!');
                } catch (error) {
                    console.error(error);
                }
            })

        }
        else {
            //playing downloaded song by name
        }
        interaction.reply ({
            content: 'playing',
            ephemeral: false
        })
    }
    else if(commandName === 'purge') {
        const files = fs.readdirSync(musicDir)
        for (const file of files) {
            fs.unlinkSync(musicDir + file)
        }
        interaction.reply ({
            content: 'purged',
            ephemeral: false
        })
    }

    else if(commandName == 'disconnect') {
        const voiceConnection = getVoiceConnection(getGuildEnv())
        getVoiceConnection(getGuildEnv())?.disconnect()
        interaction.reply ({
            content: 'disconnected',
            ephemeral: false
        })
    }
    
})

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
    return null
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
    try {
        const songPath = './music/' + fileName
        const resource = createAudioResource(songPath, {
		    inputType: StreamType.Arbitrary,
	    })
        player.play(resource);
    }
    catch (error) {
        console.error(error);
    }
	return entersState(player, AudioPlayerStatus.Playing, 5e3);
}

function getFileName(info: ytdl.videoInfo, fileExt: string = 'mp3', substring_len: number = title_length) {
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
    //strip ending whitespace
    return fileName
}

function downloadFromURL(url: string, fileName: string) {
    const a = ytdl(url, ytdl_options).pipe(fs.createWriteStream(musicDir + fileName))
    a.on('finish', () => { 
        console.log('download \"' + fileName + '\" finished') 
        setMetaData(musicDir+fileName, url)
        return
    })

}

function setMetaData(songPath:string, URL:string) {
    const currData = ffmetadata.read(songPath)
    ytdl.getInfo(URL).then(async info => {
        const data = currData + 
        {
            artist: info.videoDetails.author,
            title: info.videoDetails.title,
            year: info.videoDetails.publishDate.substring(0, 4),
            genre: info.videoDetails.category,
            duration: info.videoDetails.lengthSeconds,
            url: URL,
        }
        ffmetadata.write(songPath, data, function(err: any) {
            if(err) {
                console.error(err);
            }
            console.log('metadata written');
        })
    })
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

let x:Promise<string> = client.login(process.env.TOKEN)