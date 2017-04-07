'use strict'

const kue = require('kue')
const _ = require('lodash')
const Hoek = require('hoek')
const IncludeAll = require('include-all')
const SayHelloJob = require('../jobs/say-hello-job')

const defaults = {
    // used Redis prefix
    // if you use a single Redis instance for multiple apps
    // use different prefixes to distinguish the apps
    prefix: 'q',

    // default Redis configuration, with host and port
    // kue allows further Redis connections,
    // see https://github.com/Automattic/kue#redis-connection-settings
    redis: {
        // Redis server host
        host: '127.0.0.1',
        // Redis server port
        port: 6379
    }
}

let Queue

/**
 * Extract the job's name from file name
 * e.g. file name "EmailJob" results in "email"
 *
 * @param fileName - the job's file name
 * @returns {string} job name based on file name
 */
const getJobName = function getJobName (fileName) {
    let jobType = fileName.replace(/-job$/, '')
    return jobType.toLowerCase()
}

/**
 * load and initialize job processing for the queue
 *
 * @param jobsPath - path to the jobs folder
 */
const initializeJobs = function initializeJobs (jobsPath, server) {
    // find all jobs in the defined path
    const jobs = IncludeAll({
        dirname: jobsPath,
        filter: /(.+job)\.js$/,
        excludeDirs: /[^\/]+$/,
        optional: true
    })

    // load all jobs and attach their processing to the queue
    _.keys(jobs).forEach(function (job) {
        // infer job type job name
        const jobNameFromFile = getJobName(job)

        // get job definition from loaded job files
        const jobConfig = jobs[ job ]

        // set either the defined job name from job itself or the job file
        const jobName = jobConfig.name || jobNameFromFile
        // set job concurrency from job itself or default to 1
        const jobConcurrency = jobConfig.concurrency || 1

        Hoek.assert(jobConfig.process, 'The defined job "' + jobName + '" requires a "process" function')

        // tell the queue how to process the job
        // set job type with concurrency and the actual processing
        Queue.process(
            jobName,
            jobConcurrency,
            jobConfig.process)
    })
}

/**
 * Creates kue job
 * increase attempts to 3
 *
 * @param job - a custom user job, initialized with Job.create(data)
 *
 * @returns {kue-job} returns a kue job object
 */
const createJob = function createJob (job) {
    return Queue.create(job.name, job.data).attempts(3)
}

/**
 * publish the job for processing
 *
 * @param job - either a kue job or a custom user job
 * @returns {Job|*} kue job callback ( fn(err) )
 */
const dispatch = function dispatch (job = {}) {
    // dispatching a raw job? Create a kue job first
    if (job.name && job.data) {
        job = createJob(job)
    }

    return job.save()
}

/**
 * The hapi plugin implementation
 * @param server
 * @param options
 * @param next
 */
exports.register = (server, options = {}, next) => {
    options = Object.assign(defaults, options)
    Queue = kue.createQueue(options)

    Queue.on('job enqueue', function (id, type) {
        console.log('Job %s got queued of type %s', id, type);
    })

    const jobsPath = options.jobsPath
    Hoek.assert(jobsPath, 'hapi-queue: path to jobs is required. Configure "jobsPath" in plugin options')

    initializeJobs(jobsPath, server)

    // decorate the hapi server with the queue and job creation methods
    server.decorate('server', 'queue', Queue)
    server.decorate('server', 'dispatch', dispatch)
    server.decorate('server', 'createJob', createJob)

    next()
}

exports.register.attributes = {
    pkg: require('../package.json')
}
