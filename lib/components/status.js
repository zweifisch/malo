const fs = require('fs')
const http = require('http')
const {start, stop, dependencies} = require('../symbols')
const log = require('debug')('malo:status')

class Status {

	get [dependencies]() {
		return ['system']
	}

    constructor(socket) {
        this.socket = socket
    }

	async [start]({system}) {
		this.server = http.createServer((request, response) => {
			response.end(system.digraph)
		})

		return new Promise((resolve, reject) => {
			try {
				fs.unlinkSync(this.socket)
			} catch (e) {}
			this.server.listen(this.socket, err => {
				log(err ? err :`server is listening on ${this.socket}`)
				err ? reject(err) : resolve()
			})
		})
	}

	async [stop]()  {
		await new Promise((resolve, reject) => {
			this.server.close(()=> resolve())
		})
	}

}

module.exports = Status
