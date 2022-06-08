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

const title_length: number = 10
const ytdl_options: ytdl.downloadOptions = {filter: 'audioonly'}
const musicDir:     string = 'music/'
const guildId = '982793020736962581'

dotenv.config()

const player = createAudioPlayer();

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

//const voice = new DiscordJS.VoiceChannel({})

client.on('ready', async () => {
    console.log('ready!')
    const guild = client.guilds.cache.get(guildId)
    let commands
    if (guild) {
        commands = guild.commands
    } else {
        commands = client.application?.commands
    }
    try {
		await playSong();
		console.log('Song is ready to play!');
	} catch (error) {
		console.error(error);
	}
    //make music directory if it doesn't exist
    // makeMusicDirectory()
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
    //     ]
    // })
})

client.on('message', async (message) => {
	if (!message.guild) return;

	if (message.content === '-join') {
		const channel = message.member?.voice.channel;

		if (channel) {
			try {
                const voice = await channel.fetch(true)
                if (voice.type == 'GUILD_VOICE') {
                    const connection = await connectToChannel(voice);
                    connection.subscribe(player);
                    message.reply('Playing now!');
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
//         //const callingUser = interaction.member
//         //const vc = interaction.member?.guild.voice.channel
//         const guild = client.guilds.cache.get(guildId)
//         const vc = interaction.client.application?.owner?.id
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
// 				const connection = await connectToChannel(vc)
// 				connection.subscribe(player);
// 				interaction.reply('Playing now!');
// 			} catch (error) {
// 				console.error(error);
// 			}

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
            console.log('music directory already exists')
        } else if (err){
            console.log(err.code)
        } else {
            console.log('path \"' + musicDir + '\" not found. Created directory.')
        }
    })
}

let x:Promise<string> = client.login(process.env.TOKEN)