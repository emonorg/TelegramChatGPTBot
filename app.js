import {} from 'dotenv/config'
import { Telegraf } from 'telegraf'
import { downloadVoice } from './lib/utils.js'
import DB from './lib/db.js'
import ChatGPT from './lib/chatgpt.js'
import Picovoice from './lib/picovoice.js'

const telegramAccessKey = process.env.TELEGRAM_PROD_ACCESS_KEY
const telegramSandBoxAccessKey = process.env.TELEGRAM_SANDBOX_ACCESS_KEY

const bot = new Telegraf(telegramSandBoxAccessKey)
const db = new DB()
const chatGPT = new ChatGPT()
const picoVoice = new Picovoice()

bot.start(async (ctx) => {
    await ctx.reply('Try to ask something...');
})

bot.on('text', async ctx => {
    const firstResponse = await sendFirstResponse(ctx)
    const responseFromGPT = await chatGPT.preparePromptAndSendRequest(ctx, ctx.message.text)
    return await updateMessage(ctx.chat.id, firstResponse.message_id, responseFromGPT)
});

bot.on('voice', async ctx => {
    const firstResponse = await sendFirstResponse(ctx)
    const file = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const downloadedFileName = await downloadVoice(ctx, ctx.message.voice.file_id, file.href)
    const text = await picoVoice.getTextFromSpeech(`./voices/${downloadedFileName}.ogg`)
    const responseFromGPT = await chatGPT.preparePromptAndSendRequest(ctx, text)
    await updateMessage(ctx.chat.id, firstResponse.message_id, responseFromGPT)
});

async function sendFirstResponse(ctx) {
    return await sendMessage(ctx.chat.id, '⏳ Please wait')
}

async function sendMessage(chatId, message) {
    return await bot.telegram.sendMessage(chatId, message)
}

async function updateMessage(chatId, messageId, message) {
    return await bot.telegram.editMessageText(chatId, messageId, undefined, message)
}

bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))