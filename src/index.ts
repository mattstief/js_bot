import {
    player,
    client
} from './globals'
import {
    stateEvent,
    readyEvent,
    interactionEvent
} from './events'

player.addListener('stateChange', () => stateEvent())

client.on('ready', async () => readyEvent())

client.on('interactionCreate', async (interaction) => interactionEvent(interaction))

let x:Promise<string> = client.login(process.env.TOKEN)