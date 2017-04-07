'use strict'

let SayHello = {
    name: 'hello',

    concurrency: 10,

    init (name) {
        this.name = name
    },

    process: (job, ctx, done) => {
        const name = job.data.name
        console.log('Hello: ' + name)
        done()
    }
}


exports = SayHello.init
exports.process = SayHello.process
exports.concurrency = SayHello.concurrency
