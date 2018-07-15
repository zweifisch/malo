const http = require('http')
const {System, start, stop, dependencies, Status} = require('../')

class Server {

    get [dependencies]() {
        return ['cfg']
    }

    async [start]({cfg}) {
        this.server = http.createServer((request, response) => {
            response.end('aha')
        })

        await new Promise((resolve, reject) => {
            this.server.listen(cfg.port, err => err ? reject(err) : resolve())
        })

        console.log(`server listening on ${cfg.port}`)
    }

    async [stop]()  {
        await new Promise((resolve, reject) => {
            this.server.close(()=> resolve())
        })
    }

}

class Config {
    get port() {
        return 9696
    }
}

let system = new System({
    server: Server,
    cfg: Config,
    status: new Status('/tmp/app-status')
})

system.start('server')
system.start('status')
