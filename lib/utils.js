import fetch from 'node-fetch'
import fs from 'fs'

export function normalizeResponse(response) {
    response = response.replace('output2: ', '')
    response = response.replace('Output2: ', '')
    response = response.replace('Output2:\n', '')
    response = response.replace('\n\n', '')
    return response
}

export async function downloadVoice(ctx, fileId, href) {
    const buffer = await (await fetch(href)).arrayBuffer()
    const fileName = `${ctx.chat.username}-${fileId}`
    await fs.promises.writeFile(`./voices/${ctx.chat.username}-${fileId}.ogg`, Buffer.from(buffer), (err) => console.log(err));
    return fileName;
}