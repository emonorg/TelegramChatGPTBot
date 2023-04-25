import {} from 'dotenv/config'
import { Telegraf } from 'telegraf'
import fetch from 'node-fetch'
import { JsonDB, Config } from 'node-json-db'
import {Leopard} from '@picovoice/leopard-node'
import fs from 'fs'

var db = new JsonDB(new Config("Database", true, false, '/'));

const telegramAccessKey = process.env.TELEGRAM_PROD_ACCESS_KEY
const telegramSandBoxAccessKey = process.env.TELEGRAM_SANDBOX_ACCESS_KEY
const RapidApiKey = process.env.RAPID_API_KEY
const RapidApiHost = process.env.RAPID_HOST
const picovoiceAccessKey = process.env.PICOVOICE_ACCESS_KEY

const bot = new Telegraf(telegramAccessKey)
const handle = new Leopard(picovoiceAccessKey);

bot.start(async (ctx) => {
    await ctx.reply('Try to ask something...');
})

bot.on('text', async ctx => {
    // ctx.reply('Clean')
    // return
    let response = null
    const message = ctx.message.text.split(' ')
    if (message[0] === 'cli' && ctx.chat.username === 'emadmamaghani') {
        response = await handleCommand(message[1], message.slice(2))
    } else {
        const message = await sendMessage(ctx.chat.id, 'Give me a sec! on it...')
        const responseFronGPT = await handleGPT(ctx, ctx.message.text)
        return await updateMessage(ctx.chat.id, message.message_id, responseFronGPT)
    }
    sendMessage(ctx.chat.id, response)
});

bot.on('voice', async ctx => {
    const message = await sendMessage(ctx.chat.id, 'Give me a sec! I will send you the result...')
    const file = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
    const downloadedFileName = await downloadVoice(ctx, ctx.message.voice.file_id, file.href)
    const text = await getTextFromSpeech(`./voices/${downloadedFileName}.ogg`)
    const responseFromGPT = await handleGPT(ctx, text)
    bot.telegram.deleteMessage(ctx.chat.id, message.message_id)
    await sendMessage(ctx.chat.id, responseFromGPT)
});

async function handleGPT(ctx, input) {
    // Get the chat context
    // Fetch the latest input and output
    let promptHistory = await readDataFromDB(ctx.chat.username)
    if (promptHistory != null) 
        promptHistory = promptHistory.messageLog[promptHistory.messageLog.length - 1]
    let output = await sendRequestToChatGPT(input, promptHistory)
    output = output.replace('output2: ', '')
    await saveToDB(ctx.chat.username, input, output)
    return output
}

async function handleCommand(command, args) {
    switch (command) {
        case 'message-log':
            const data = await readDataFromDB(args[0])
	    if (data == null) {
		    return 'No log for specified username!'
	    }
            let logs = ''
            let logList = data.messageLog
            if (args[1] !== undefined) {
                logList = logList.slice(logList.length - args[1])
            }
            for (let log of logList) {
                logs += ' # ' + log
            }
            return logs
    }
}

async function getTextFromSpeech(filePath) {
    const result = await handle.processFile(filePath);
    return result.transcript
}

async function downloadVoice(ctx, fileId, href) {
    const buffer = await (await fetch(href)).arrayBuffer()
    const fileName = `${ctx.chat.username}-${fileId}`
    await fs.promises.writeFile(`./voices/${ctx.chat.username}-${fileId}.ogg`, Buffer.from(buffer), (err) => console.log(err));
    return fileName;
}

async function sendRequestToChatGPT(message, promptHistory) {
    let input
    if (promptHistory != null)
        input = `prompt1: ${promptHistory.input} output1: ${promptHistory.output}. prompt2: ${message}`
    else
        input = message
    const body = JSON.stringify({
        "model": "gpt-3.5-turbo",
        "messages": [
            {
                "role": "user",
                "content": input
            }
        ]
    })
    const response = await fetch('https://openai80.p.rapidapi.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': RapidApiKey,
            'X-RapidAPI-Host': RapidApiHost
        },
        body
    })
    const data = await response.json()
    return data.choices[0].message.content
}

async function sendMessage(chatId, message) {
    return await bot.telegram.sendMessage(chatId, message)
}

async function updateMessage(chatId, messageId, message) {
    return await bot.telegram.editMessageText(chatId, messageId, undefined, message)
}

async function saveToDB(path, input, output) {
    await db.push(`/${path}`, {messageLog: [{input, output}]}, false);
}

async function readDataFromDB(path) {
    try {
    	const data = await db.getData(`/${path}`);
    	return data
    } catch {
	return null
    }
}

bot.launch()
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))