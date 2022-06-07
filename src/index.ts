import DiscordJS, { Client, VoiceChannel, Intents } from 'discord.js';
// import {
// 	joinVoiceChannel,
// 	createAudioPlayer,
// 	createAudioResource,
// 	entersState,
// 	StreamType,
// 	AudioPlayerStatus,
// 	VoiceConnectionStatus,
// } from '@discordjs/voice'
import dotenv from 'dotenv'
import ytdl from 'ytdl-core'
import * as fs from 'fs'

const title_length: number = 10
const ytdl_options: ytdl.downloadOptions = {filter: 'audioonly'}
const musicDir:     string = 'music/'

dotenv.config()

const client = new DiscordJS.Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
})

client.on('ready', () => {
    console.log('ready!')

    const guildId = '982793020736962581'
    const guild = client.guilds.cache.get(guildId)
    let commands
    if (guild) {
        commands = guild.commands
    } else {
        commands = client.application?.commands
    }
    //make music directory if it doesn't exist
    makeMusicDirectory()
    commands?.create({
        name: 'ping',
        description: 'replies pong '
    })
    commands?.create({
        name: 'play',
        description: 'plays a song with name as an argument',
        options: [
            {
                name: 'link_or_name',
                description: 'the link or name of the song',
                required: true,
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING
            }//,
            //{
            //     name: 'volume',
            //}
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
            ephemeral: true
        })
    }
    else if(commandName === 'play') { 
        interaction.reply({
            content: 'playing',
            ephemeral: false
        })
        if (options == null) {
            return
        }
        const playArg = options.getString('link_or_name')
        if (playArg == null) {
            return
        }
        const isValidLink:boolean = ytdl.validateURL(playArg)
        if (isValidLink) {  //download it, then play to vc
            //check if link has already been downloaded before attempting download
            const URL: string = playArg
            ytdl.getInfo(playArg).then(info => {
                const fileName = getFileName(info)
                downloadFromURL(URL, fileName)
            })
        } else if (true){            //check if the title is in the music dir, play it if found
            //search musicDir for fileName, play closest match
        }
        else {  //arg 'playArg' is not a valid link or title

        }
    }
})

function getFileName(info: ytdl.videoInfo, fileExt: string = 'mp3', substring_len: number = title_length) {
    const title = info.videoDetails.title
    const titleSubstr = title.substring(0, substring_len)
    const fileName = titleSubstr + '.' + fileExt
    return fileName
}

function downloadFromURL(url: string, fileName: string) {
    const a = ytdl (url, ytdl_options).pipe(fs.createWriteStream(musicDir + fileName))
    a.on('finish', () => { 
        console.log('download \"' + fileName + '\" finished') 
        return
    })
}

function makeMusicDirectory() {
    fs.mkdir(musicDir, (err) => {
        if (err && err.code == 'EEXIST') {
            console.log('music directory already exists')
        } else if (err){
            console.log(err.code)
        } else {
            console.log('path \"' + musicDir + '\" not found. Created directory.')
        }
    })
}

client.login(process.env.TOKEN)