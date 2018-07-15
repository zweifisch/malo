const {System} = require('./system')
const {dependencies, start, stop} = require('./symbols')

class Kv {
    constructor() {
        this.state = {}
    }
    get (key) {
        return this.state[key]
    }
    set (key, val) {
        this.state[key] = val
    }
    incr (key) {
        this.state[key] = (this.state[key] || 0) + 1 
        return this.state[key]
    }
}

class App {
    get [dependencies]() {
        return ['kv']
    }

    [start] ({kv}) {
        kv.incr('app')
    }
}


let system = new System()
system.register({
    kv: Kv,
    app: App,
})

test('component', async () => {
    await system.start('kv')
    let kv = system.get('kv')
    expect(kv.get('k1')).toBe(undefined)
    kv.set('k1', 1)
    expect(kv.get('k1')).toBe(1)
})

test('dependency injection', async () => {
    await system.start('app')
    let kv = system.get('kv')
    expect(kv.get('app')).toBe(1)
})


class Comp0 {
    get [dependencies]() {
        return ['comp0']
    }
}

class Comp1 {
    get [dependencies]() {
        return ['comp2']
    }
}

class Comp2 {
    get [dependencies]() {
        return ['comp1']
    }
}

let sys2 = new System()
sys2.register({
    comp1: Comp1,
    comp2: Comp2,
})


let sys3 = new System()
sys3.register({
    comp0: Comp0,
})

test('cycle dependency detection', async () => {
    expect(sys3.start('comp0')).rejects
        .toEqual(new Error('Cycle Dependency Detected: comp0 -> comp0'))
})
