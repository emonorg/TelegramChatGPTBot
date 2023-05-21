import { Configuration as OpenAIConfiguration, OpenAIApi } from 'openai'
import DB from './db.js'
import { normalizeResponse } from './utils.js'

export default class ChatGPT {
    constructor() {
        this.db = new DB()
        const openAIConfiguration = new OpenAIConfiguration({
            organization: 'org-256JAC0OXRiQBebALYt5bu0y',
            apiKey: process.env.OPENAI_API_KEY
        })
        this.openAI = new OpenAIApi(openAIConfiguration)
    }

    async preparePromptAndSendRequest(ctx, input) {
        let promptHistory = await this.db.readDataFromDB(ctx.chat.username)
        if (promptHistory != null) 
            promptHistory = promptHistory.messageLog[promptHistory.messageLog.length - 1]
        let output = await this.sendRequestToChatGPT(input, promptHistory)
        if (!output) return ctx.reply('Error occured!')
        output = normalizeResponse(output)
        await this.db.saveToDB(ctx.chat.username, input, output)
        return output
    }

    async sendRequestToChatGPT(message, promptHistory) {
        let input
        if (promptHistory != null)
            input = `prompt1: ${promptHistory.input} output1: ${promptHistory.output.match(/^(.*?)[.?!]\s/) == null ? promptHistory.output : promptHistory.output.match(/^(.*?)[.?!]\s/)[1]}. prompt2: ${message}`
        else
            input = message
    
        const response = await this.openAI.createCompletion({
            model: 'text-davinci-003',
            prompt: message,
            max_tokens: 200
        })
    
        if (response.status !== 200) {
            console.log('Error occured')
        }
        return response.data.choices[0].text
    }
}