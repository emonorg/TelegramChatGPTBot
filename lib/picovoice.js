import {Leopard} from '@picovoice/leopard-node'

export default class Picovoice {
    constructor() {
        this.picoVoice = new Leopard(process.env.PICOVOICE_ACCESS_KEY);
    }

    async getTextFromSpeech(filePath) {
        const result = await this.picoVoice.processFile(filePath);
        return result.transcript
    }
}

