import DiscordJS, { Intents } from 'discord.js'
import dotenv from 'dotenv'

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
})

// client.on('messageCreate', (message) => {
//     if (message.content === 'ping') {
//         message.reply({
//             content: 'pong'
//         })
//     }
//     if (message.content === '/play') {
//         message.reply({
//             content: 'pong'
//         })
//     }
// })

client.login(process.env.TOKEN)