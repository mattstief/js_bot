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
    printVideoChapters,
    skipSong,
    getGuildEnv,
    playSong,
    playResource,
    getResource,
    appendSongQueue,
    appendChunkQueue,
	getFileName,
    sleep,
    createSilentAudioFile,
    chunkSong,
} from './functions'
import {
    songQueue,
    chunkQueue,
    title_length,
    ytdl_options,
    musicDir,
    audioExt,
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
    
    //TODO free playing resource if any
    const files = fs.readdirSync(musicDir)
    console.log("FILES: ", files)
    for (const file of files) {
        const isDir:boolean = !file.includes('.')
        if (isDir) {
            fs.rmdirSync(musicDir + file, {recursive: true})
        }
        else {
            fs.unlinkSync(musicDir + file)
        }
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
    const userGuild = client.guilds.cache.get(getGuildEnv())
    const members = await userGuild?.members
    if (!members || !userGuild?.memberCount) {
        return
    }

    const playArg = options.get('link_or_name')
    if (playArg == null) {
        return
    }
    if (!playArg.value || typeof(playArg.value) != 'string') {
        return
    }
    const URL = playArg.value
    const isValidLink:boolean = ytdl.validateURL(URL)
    if (isValidLink) {  //download it, then play to vc
        //TODO check if link has already been downloaded before attempting download
        ytdl.getInfo(URL).then(async info => {
            printVideoChapters(info)
            let fileName = getFileName(info)
            let a = downloadFromURL(URL, fileName)
            ;(await a).once('finish', async () => {
                const child = chunkSong(fileName)
                child.once('close', async () => {
                    const isFirstSong:boolean = (songQueue.length == 0)
                    //await appendSongQueue(fileName).then(async () => {
                    await appendChunkQueue(fileName).then(async () => {
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
                            if (isFirstSong) {
                                console.log("only one song in queue")
                                await playResource(chunkQueue[0])
                                //await playSong(songQueue[0]);
                            }
                        } catch (error) {
                            console.error(error);
                        }
                    })
                })  
            })
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

function seek(interaction:BaseCommandInteraction<CacheType>) {
    /*TODO implement seek
    ffmpeg could enable this, see here https://trac.ffmpeg.org/wiki/Seeking
    but it feels a bit janky since the AudioPlayer utilizes ffmpeg to play the song, 
    not sure if using this will be compatible with the AudioPlayer.
    
    We could also split up chunks of the song into chapters(if available from yt video) 
    during download, then save the chapters as separate resources, and seek to the chapter.
    */
    console.log(client.voice.adapters.get('resource'))
    interaction.reply ({
        content: 'seeked',
        ephemeral: false
    })
}

function test(interaction:BaseCommandInteraction<CacheType>, 
    options:Omit<DiscordJS.CommandInteractionOptionResolver<DiscordJS.CacheType>, 
    "getMessage" | "getFocused">) {

    const arg1 = Number(options.get("number")?.value)
    //console.log("number: ", arg1)

    let arg2:string
    if (options.get("string") == null) {
        arg2 = "mt"
    }
    else {
        arg2 = String(options.get("string")?.value)
    }

    //console.log("string: ", arg2)
    interaction.reply ({
        content: createSilentAudioFile(arg1, arg2),
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
    resume,
    seek,
    test
}