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
import fs from 'fs'

const title_length = 10

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
    if(commandName === 'play') { 
        interaction.reply({
            content: 'playing',
            ephemeral: false
        })
        if (options) {
            const arg1 = options.getString('link_or_name')
            if (arg1){
                console.log(arg1)
                //file name should be the first x chars of the video title
                ytdl.getInfo(arg1).then(info => {
                    //TODO validate url ytdl.validateURL(url)

                    const fileName = info.videoDetails.title.substring(0, title_length) + '.mp3'
                    console.log(fileName)
                    //format video name here.... if you want to
                    let a = ytdl (arg1, {filter: 'audioonly'}).pipe(fs.createWriteStream('music/' + fileName))
                    a.on('finish', () => { 
                       console.log('done') 
                    })
                    //find callers voice channel
                    //join if not already in one
                    //play audio from file
                })
                
            }
        }

    }
})

client.login(process.env.TOKEN)