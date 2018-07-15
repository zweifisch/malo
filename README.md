# malo

managed lifecycle of stateful components in nodejs

- manage stateful component in one place, code in modules should be stateless
- component dependency injection
- reloadability
- dependency tree visualization

## usage

``` js
const http = require('http')
const {System, start, stop, dependencies} = require('malo')

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
})

system.start('server')
```

### reloading(TBD)

### dependency tree visualization

``` js
let {Status, System} = require('malo')

let system = new System({
    ...
    status: Status('/tmp/app-status')
})

system.start('status')
```

``` shell
curl -s --unix-socket /tmp/app-status http://localhost | dot -Tpng | feh -
```

## builtin components

### system

### status

provides internal status inspection
