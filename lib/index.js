'use strict'

const Fs = require('fs');
const _ = require('lodash');
const Hoek = require('hoek');

const dispatch = (job = {}) => {

  return Queue.add(job)
}

/**
 * The hapi plugin implementation
 * @param server
 * @param options
 * @param next
 */
exports.register = (server, options = {}, next) => {

  Hoek.assert(options.driver, 'hapi-queue needs driver to handle jobs')

  // create `Queue` based on driver
  switch (options.driver) {
    case 'rethinkdb-job-queue':
      Queue = new RethinkDBJobQueue(options.connection, server)
      break

    case 'kue':
      Queue = new RethinkDBJobQueue(options.connection)
      break

    case 'default':
      Queue = new RethinkDBJobQueue(options.connection, options.queue_options)
  }

  const jobsPath = options.jobsPath
  Hoek.assert(jobsPath, 'Path to hapi-queue jobs cannot be empty')

  Queue.importJobs(jobsPath)

  server.decorate('server', 'queue', Queue)
  server.decorate('server', 'dispatch', dispatch)

  next()
}

exports.register.attributes = {
  pkg: require('../package.json')
}
