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

client.on('ready', () => readyEvent())

client.on('interactionCreate', (interaction) => interactionEvent(interaction))

let x: Promise<string> = client.login(process.env.TOKEN)