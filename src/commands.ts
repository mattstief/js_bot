import ytdl from 'ytdl-core'
import DiscordJS, { Client, VoiceChannel, Intents, Message, BaseCommandInteraction, CacheType } from 'discord.js';
import * as fs from 'fs'
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
import {
    exitCallback,
    connectToChannel,
    downloadFromURL,
    skipSong,
    getGuildEnv,
    playSong,
    makeMusicDirectory,
    appendSongQueue,
	getFileName,
    sleep
} from './functions'
import {
    songQueue,
    title_length,
    ytdl_options,
    musicDir,
    player,
    client
} from './globals'


function disconnect (interaction:BaseCommandInteraction<CacheType> | null = null) {
    player.stop()
    const voiceConnection = getVoiceConnection(getGuildEnv())
    getVoiceConnection(getGuildEnv())?.disconnect()
    if (interaction) {
        interaction.reply ({
            content: 'disconnected',
            ephemeral: false
        })
    }
}

function purge (interaction:BaseCommandInteraction<CacheType>) {
    //TODO check if song is player - if so, either:
    //1) stop it to free the resource
    //2) skip deletion of that song
    const files = fs.readdirSync(musicDir)
    for (const file of files) {
        fs.unlinkSync(musicDir + file)
    }
    interaction.reply ({
        content: 'purged',
        ephemeral: false
    })
}

function skip(interaction:BaseCommandInteraction<CacheType>) {
    let songName = skipSong()
    let reply = ''
    if (songName) {
        reply = 'skipped ' + songName
    }
    else {
        reply = 'no songs in queue'
    }
    interaction.reply ({
        content: reply,
        ephemeral: false
    })
}

function pause(interaction:BaseCommandInteraction<CacheType>) {
    console.log('pausing')
    player.pause()
    //TODO check if playing
    interaction.reply ({
        content: 'paused',
        ephemeral: false
    })
}

function resume(interaction:BaseCommandInteraction<CacheType>) {
    if(player.playable) {
        player.unpause()
    }
    interaction.reply ({
        content: 'resumed',
        ephemeral: false
    })
}

async function play (interaction:BaseCommandInteraction<CacheType>, 
    options:Omit<DiscordJS.CommandInteractionOptionResolver<DiscordJS.CacheType>, 
    "getMessage" | "getFocused">) {
    //console.log("play command received") 
    if (interaction.member) {
        //console.log("member present")
    }
    const userGuild = client.guilds.cache.get(getGuildEnv())
    const members = await userGuild?.members
    if (!members || !userGuild?.memberCount) {
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
        ytdl.getInfo(URL).then(async info => {
            let fileName = getFileName(info)
            await downloadFromURL(URL, fileName)
            try {
                const vc = (await members.fetch(interaction.user.id)).voice.channel
                if (!vc) {
                    interaction.reply ({
                        content: 'not in a voice channel',
                        ephemeral: false
                    })
                    return
                }
                const connection = await connectToChannel(vc)
                if (!connection) {
                    return
                }
                if (!fileName) {
                    console.log("no file name")
                    return
                }
                appendSongQueue(fileName)
                if (songQueue.length == 1) {
                    console.log("only one song in queue")
                    await playSong(fileName);
                }
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

function ping(interaction:BaseCommandInteraction<CacheType>) {
    interaction.reply ({
        content: 'pongers',
        ephemeral: false
    })
}

export {
    disconnect,
	purge,
	skip, 
	play,
    ping,
    pause,
    resume
}