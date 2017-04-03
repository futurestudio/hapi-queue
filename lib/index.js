'use strict'

const Fs = require('fs');
const _ = require('lodash');
const Hoek = require('hoek');

const Kue = require('kue');
const Queue = Kue.createQueue();
Kue.app.listen(4000);

const dispatch = (job) => {
    if (_.isEmpty(job)) {
        return
    }

    Queue.create(job.type, job.data).save()
}

/**
 * The hapi plugin implementation
 * @param server
 * @param pluginOptions
 * @param next
 */
exports.register = (server, options = {}, next) => {
    const driver = options.driver
    const jobsPath = options.jobsPath
    Hoek.assert(jobsPath, 'Path to hapi-queue jobs cannot be empty')

    const files = Fs.readdirSync(jobsPath)
    _.forEach(files, (file) => {
        const Job = require(file)

        if (!_.isEmpty(Job)) {
            Queue.process(Job.type, Job.process)
        }
    })

    server.decorate('server', 'createJob', Queue.create)
    server.decorate('server', 'queue', Queue)
    server.decorate('server', 'dispatch', dispatch)

    next();
};


exports.register.attributes = {
    pkg: require('../package.json')
};
