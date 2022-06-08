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
	const resource = createAudioResource('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', {
		inputType: StreamType.Arbitrary,
	});

	player.play(resource);

	return entersState(player, AudioPlayerStatus.Playing, 5e3);
}

async function connectToChannel(channel: VoiceChannel) {
	const connection = joinVoiceChannel({
		channelId: channel.id,
		guildId: channel.guild.id,
		adapterCreator: createDiscordJSAdapter(channel),
	});

	try {
		await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
		return connection;
	} catch (error) {
		connection.destroy();
		throw error;
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
    try {
		await playSong();
		console.log('Song is ready to play!');
	} catch (error) {
		console.error(error);
	}
    console.log('ready!')

    // commands?.create({
    //     name: 'ping',
    //     description: 'replies pong '
    // })
    // commands?.create({
    //     name: 'play',
    //     description: 'plays a song with name as an argument',
    //     options: [
    //         {
    //             name: 'link_or_name',
    //             description: 'the link or name of the song',
    //             required: true,
    //             type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
    //         },
    //         {
    //             name: 'user',
    //             description: 'the user to play the song for',
    //             required: false,
    //             type: DiscordJS.Constants.ApplicationCommandOptionTypes.USER,
    //         }
    //     ]
    // })
})

client.on('messageCreate', async (message) => {
	if (!message.guild) return;

	if (message.content === '-') {
		const channel = message.member?.voice.channel;

		if (channel) {
			try {
                const voice = await channel.fetch()
                if (voice.type == 'GUILD_VOICE') {
                    const connection = await connectToChannel(voice);
                    let subscription = connection.subscribe(player);
                    if (subscription) {
                        console.log('subscribed to player')
                    }
                    else{
                        console.log('failed to subscribe to player')
                    }
                }

			} catch (error) {
				console.error(error);
			}
		} else {
			message.reply('Join a voice channel then try again!');
		}
	}
});

// client.on('interactionCreate', async (interaction) => {
//     if(!interaction.isCommand()) {
//         //if (interaction.isMessageComponent())
//         //do interesting things with the interaction
//         return
//     }
//     const {commandName, options} = interaction
//     if (commandName === 'ping') {
//         interaction.reply ({
//             content: 'pongers',
//             ephemeral: true
//         })
//     }
//     else if(commandName === 'play') { 
//         const guild = client.guilds.cache.get(getGuildEnv())
//         console.log('interaction type:' + interaction.type)
//         interaction.reply({
//             content: 'playing',
//             ephemeral: false
//         })
//         if (options == null) {
//             return
//         }
//         const playArg = options.getString('link_or_name')
//         if (playArg == null) {
//             return
//         }
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
//                 interaction.reply('Playing now!');
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
// })

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