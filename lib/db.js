import { JsonDB, Config } from 'node-json-db'

export default class DB {
    constructor() {
        this.db = new JsonDB(new Config("Database", true, false, '/'));
    }

    async readDataFromDB(path) {
        try {
            const data = await this.db.getData(`/${path}`);
            return data
        } catch {
            return null
        }
    }

    async saveToDB(path, input, output) {
        await this.db.push(`/${path}`, {messageLog: [{input, output}]}, false);
    }
}