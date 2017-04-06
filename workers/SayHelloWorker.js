'use strict'

let Worker = {
    // amount of workers being processed concurrently
    concurrency: 1,

    process: (job, ctx, done) => {
        const name = job.data.name
        console.log('Hello: ' + name)

        done()
    }
}

module.exports = Worker
