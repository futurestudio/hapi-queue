'use strict'

const Fs = require('fs')
const kue = require('kue')
const _ = require('lodash')
const Hoek = require('hoek')
const IncludeAll = require('include-all')()

const defaults = {
    redis: {
        //default redis configuration
        redis: {
            //default redis server port
            port: 6379,
            //default redis server host
            host: '127.0.0.1'
        }
    }
}

let Queue

const getWorkerName = function getWorkerName (worker) {
    let jobType = worker.replace(/Worker$/, '')
    return jobType.toLowerCase()
}

//workers loader
const initializeWorkers = function initializeWorkers (workerPath) {
    // find all workers in defined user path
    const workers = IncludeAll({
        dirname: workerPath,
        filter: /(.+Worker)\.js$/,
        excludeDirs: /^\.(git|svn)$/,
        optional: true
    })

    // load all workers and attach the processing them to queue
    _.keys(workers).forEach(function (worker) {
        //deduce job type form worker name (add prefix)
        const workerName = getWorkerName(worker)

        //grab worker definition from
        //loaded workers
        const workerConfig = workers[ worker ]
        const workerConcurrency = workerConfig.concurrency || 1

        //tell subscriber about the
        //worker definition
        //and register if
        //ready to perform available jobs
        Queue.process(workerName, workerConcurrency, workerConfig.process)
    })
}

const dispatch = function dispatch (queueName, job) {
    job.save()
}

/**
 * The hapi plugin implementation
 * @param server
 * @param options
 * @param next
 */
exports.register = (server, options = {}, next) => {
    options = Object.assign(defaults, options)
    Queue = kue.createQueue(options.redis)

    const workerPath = options.workerPath
    Hoek.assert(workerPath, 'Path to hapi-queue workers cannot be empty')

    initializeWorkers(workerPath)

    server.decorate('server', 'queue', Queue)
    server.decorate('server', 'dispatch', dispatch)
    server.decorate('server', 'create', Queue.create)
    server.decorate('server', 'createJob', Queue.create)

    next()
}

exports.register.attributes = {
    pkg: require('../package.json')
}
