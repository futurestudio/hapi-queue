'use strict'

/**
 * Your Job constructor, being exported
 *
 * @constructor
 */
function SayHelloBuilder () {}

/**
 * kue job type, like a queue name to group tasks of the same type
 *
 * @type {string} the job type's name
 */
SayHelloBuilder.prototype.name = 'hello'

/**
 * The job's concurrency: how many workers should process queue jobs
 *
 * @type {number} - number of workers
 */
SayHelloBuilder.prototype.concurrency = 3

/**
 * Create a job with the given data
 *
 * @param data - the job's data that will be used for processing (in "process" function)
 * @returns {*} an instance of this job
 */
SayHelloBuilder.prototype.create = (data) => {
    this.data = data
    return this
}

/**
 * The Queue's process function that's executed for each incoming job
 *
 * @param job - job including the data (at job.data)
 * @param ctx - job's context, to set progress
 * @param done - callback that is required to be called once the job is finished
 */
SayHelloBuilder.prototype.process = (job, ctx, done, hapiServer) => {
    const name = job.data.name
    console.log('Hello: ' + name)
    done()
}

/**
 * Well, just expose the SayHelloBuilder job :)
 *
 * @type {SayHelloBuilder}
 */
const Builder = new SayHelloBuilder()

exports.process = Builder.process
exports.name = Builder.name
exports.create = Builder.create
exports.concurrency = Builder.concurrency
