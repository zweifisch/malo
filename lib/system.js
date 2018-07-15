const debug = require('debug')('malo')
const EventEmitter = require('events')
const {sleep} = require('promised-util')
const s = require('./symbols')


class System extends EventEmitter {

	constructor (components) {
		super()
		this.components = new Map([['system', {
			service: this,
			status: 'started',
            dependents: new Set(),
            dependencies: new Set()
		}]])
        if (components) {
            this.register(components)
        }
	}

    register(components) {
        for(let [key, cls] of Object.entries(components)) {
            let service = typeof cls === 'function' ? new cls() : cls
            this.components.set(key, {
                service,
                dependencies: new Set(service[s.dependencies]),
                dependents: new Set()
            })
            if (service.on) {
                service.on('error', err => {
                    err.service = key
                    this.emit('error', err)
                })
            }
        }
    }

    cycleDetect() {
        const cycleCheck = (key, dependents) => {
            let {dependencies} = this.components.get(key)
            if (dependents.includes(key)) {
                throw Error(`Cycle Dependency Detected: ${dependents.join(' -> ')} -> ${key}`)
            }
            if ([...dependencies].some(x => dependents.includes(x))) {
                throw Error(`Cycle Dependency Detected: ${dependents.join(' -> ')} -> ${key} -> ${[...dependencies].find(x => dependents.includes(x))}`)
            }
            dependencies.forEach(x => cycleCheck(x, [...dependents, key]))
        }

        for (let [key, component] of this.components.entries()) {
            cycleCheck(key, [])
        }
    }

    resolveDependents() {
        if (this.resolved) {
            return
        }
        for(let [key, component] of this.components.entries()) {
			let {service, dependencies} = component
			for (let dep of dependencies) {
                if (!this.components.has(dep)) {
                    throw Error(`Service '${dep}' required by ${key} is not registered`)
                }
				this.components.get(dep).dependents.add(key)
			}
        }
        this.cycleDetect()
        this.resolved = true
    }

	get instance() {
		return this
	}

    async start(serviceName, reason='no one') {
        this.resolveDependents()
        let {service} = this.getComponent(serviceName)
        let {[s.dependencies]: deps} = service 
        let instances = {}
        if (deps) {
            for (let dep of deps) {
                if (this.components.get(dep).status !== 'started') {
                    debug(`Starting ${serviceName} for ${reason}`)
                    await this.start(dep, reason)
                }
                instances[dep] = this.get(dep)
            }
        }
        if (service[s.start] && this.components.get(serviceName).status !== 'started') {
            try {
                await service[s.start](instances, reason)
            } catch (err) {
                debug(`Failed to start ${serviceName}: ${err.message}`)
                throw err
            }
            debug(`Started ${serviceName}`)
        }
        this.components.get(serviceName).status = 'started'
    }

	async stop(serviceName, reason='no one') {
		let {dependents} = this.getComponent(serviceName)
		for (let dependent of dependents) {
			await this.stop(dependent, reason)
		}
		let service = this.components.get(serviceName)
		if (service[s.stop] && this.statuses.get(serviceName) !== 'stopped') {
			debug(`Stopping ${serviceName} for ${reason}`)
			await service[s.stop]()
			debug(`Stopped ${serviceName} for ${reason}`)
		}
		this.statuses.set(serviceName, 'stopped')
	}

	getStartedDependents(serviceName) {
		if (this.components.get(serviceName).status === 'stopped') {
			return []
		}
		let {dependents} = this.components.get(serviceName)
		let ret = [].concat(...[...dependents].map(x => this.getStartedDependents(x)))
		return ret.length ? ret : [serviceName]
	}

	async restart(serviceName, reason='no one') {
		debug(`Restarting ${serviceName} for ${reason}`)
		let startedDependents = this.getStartedDependents(serviceName).filter(x => x !== serviceName)
		await this.stop(serviceName)
		await this.start(serviceName)
		for (let leaf of startedDependents) {
			await this.start(leaf, serviceName)
		}
		debug(`Restarted ${serviceName}`)
	}

	getComponent(serviceName) {
		if (!this.components.has(serviceName)) {
			throw Error(`Service '${serviceName}' not registered`)
		}
		return this.components.get(serviceName)
	}

	get(serviceName) {
		let {service} = this.getComponent(serviceName)
        return service[s.instance] || service
	}

	get leafs() {
		return [...this.components.entries()].filter(([key, service]) => service.dependents.size === 0).map(([key]) => key)
	}

	get digraph() {
		let nodes = [...this.components.entries()].map(
			([key, {status}]) => status === 'started' ? `${key} [style=filled fontcolor=white fillcolor="#87D37C"]\n` : '')
		const plot = key => {
			let {dependencies} = this.components.get(key)
			return [...dependencies].map(x => `${key}-> ${x}\n${plot(x)}`).join('\n')
		}
		let links = this.leafs.map(x => plot(x))
		return `digraph {
node [fontname="Fira Code" fontcolor="#999999" color=white style="filled" fillcolor="#f0f0f0"]
edge [penwidth="0.7" fillcolor="#c9c9c9" color="#c9c9c9"]
${nodes.join('\n')}
${links.join('\n')}}`
	}

}

module.exports = {System}
