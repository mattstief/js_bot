import DiscordJS, { Client, VoiceChannel, Intents, Message } from 'discord.js';
import {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	entersState,
	StreamType,
	AudioPlayerStatus,
	VoiceConnectionStatus,
} from '@discordjs/voice'
import { SlashCommandBuilder } from '@discordjs/builders';
import dotenv from 'dotenv'
import ytdl from 'ytdl-core'
import { createDiscordJSAdapter } from './adapter'
import * as fs from 'fs'

const title_length  : number = 10
const ytdl_options  : ytdl.downloadOptions = {filter: 'audioonly'}
const musicDir      : string = 'music/'

dotenv.config()

const player = createAudioPlayer();

function getGuildEnv() {
    const guild = process.env.GUILD_ID
    if (guild == null) {
        console.log('No guild environment variable found. Exiting.')
        process.exit(1)
    }
    return guild
}

function playSong() {
    try {
        const resource = createAudioResource('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', {
		    inputType: StreamType.Arbitrary,
	    });
        player.play(resource);
    }
    catch (error) {
        console.error(error);
    }

	return entersState(player, AudioPlayerStatus.Playing, 5e3);
}

async function connectToChannel(channel: DiscordJS.VoiceBasedChannel) {
    if (channel) {
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
                let subscription = connection.subscribe(player);
                if (subscription) {
                    console.log('subscribed to player')
                }
                else{
                    console.log('failed to subscribe to player')
                }
                return connection;
            } catch (error) {
                connection.destroy();
                throw error;
            }

        } catch (error) {
            console.error(error);
        }
    } else {
        console.log('Join a voice channel then try again!');
    }
}

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
        console.log('guild found')
        commands = guild.commands
    } else {
        console.log('no guild found')
        commands = client.application?.commands
    }
    console.log('ready!')

    commands?.create({
        name: 'ping',
        description: 'ping'
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

// client.on('messageCreate', async (message) => {
// 	if (!message.guild) return;

// 	if (message.content.startsWith('-')) {
// 		const channel = message.member?.voice.channel;
// 	}

//     else if(message.content.startsWith('/play')) {
//         console.log("play message received") 
//         if (message.author.bot) { return }
//         const guild = client.guilds.cache.get(getGuildEnv())
//         console.log('interaction type:' + message.type)
//         message.reply({
//             content: 'playing'
//         })
//         const substrs = message.content.split(' ')
//         if (substrs.length < 1){
//             return
//         }//else
//         const playArg = substrs[1]
//         if (playArg == null) {
//             return
//         }
//         console.log(playArg)
//         const isValidLink:boolean = ytdl.validateURL(playArg)
//         if (isValidLink) {  //download it, then play to vc
//             //TODO check if link has already been downloaded before attempting download
//             const URL: string = playArg
//             ytdl.getInfo(URL).then(info => {
//                 const fileName = getFileName(info)
//                 downloadFromURL(URL, fileName)
//             })
//             try {
//                 //const connection = await connectToChannel(vc)
//                 //connection.subscribe(player);
//                 console.log('Playing now!');
//             } catch (error) {
//                 console.error(error);
//             }

//         } else if (true){            //check if the title is in the music dir, play it if found
//             //search musicDir for fileName, play closest match
//         }
//         else {  //arg 'playArg' is not a valid link or title
//             //play <link> <name>
//             //play <song_title>
//         }
//     }
// });

client.on('interactionCreate', async (interaction) => {
    if(interaction.isAutocomplete()) {
        //auto complete the command
        console.log('automcomplete play')
        interaction.respond([
            {
                name: 'play a link or downloaded song',
                value: 'play'
            }
        ]);
    }

    if(!interaction.isCommand()) {
        //if (interaction.isMessageComponent())
        //do interesting things with the interaction
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
        console.log("play command received") 
        if (interaction.member != null) {
            console.log("member present")
        }
        //console.log("user: ", interaction.user)
        const userGuild = client.guilds.cache.get(getGuildEnv())
        const members = await userGuild?.members
        if (members && userGuild?.memberCount) {
            const vc = (await members.fetch(interaction.user.id)).voice.channel
            if (vc) {
                console.log('vc Found!')
                await connectToChannel(vc)
                try {
                    await playSong();
                    console.log('Song is ready to play!');
                } catch (error) {
                    console.error(error);
                }
            }
        }
    
    }
})

function getFileName(info: ytdl.videoInfo, fileExt: string = 'mp3', substring_len: number = title_length) {
    const title = info.videoDetails.title
    const titleSubstr = title.substring(0, substring_len)
    const fileName = titleSubstr + '.' + fileExt
    //strip ending whitespace
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
            //music directory already exists
        } else if (err){
            console.log(err.code)
        } else {
            console.log('path \"' + musicDir + '\" not found. Created new directory.')
        }
    })
}

let x:Promise<string> = client.login(process.env.TOKEN)