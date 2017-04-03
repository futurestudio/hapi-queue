'use strict'

const Fs = require('fs')
const _ = require('lodash')
const Path = require('path')
const Hoek = require('hoek')

const JobQueue = require('rethinkdb-job-queue')
const RethinkDBConfig = require('./../config/database')(process.env.NODE_ENV)

class RethinkDBJobQueue {

  constructor (connection, server) {
    this.Queues = {}
    this.server = server
    return this
  }

  importJobs (path) {
    const files = Fs.readdirSync(path)

    _.forEach(files, (file) => {
      const file_path = Path.join(path, file)

      if (file_path && Fs.lstatSync(file_path).isFile()) {
        let Job = require(path + '/' + Path.basename(file, '.js'))

        if (Job) {
          Job = new Job()
          const Queue = new JobQueue(RethinkDBConfig, Job.queueOptions())
          Queue.server = this.server

          Queue.process(function (job, next) {
            job.server = Queue.server
            Job.process(job, next)
          })

          Hoek.assert(!this.Queues[ Job.queue_name ], 'RethinkDB Queue already contains a job for: ' + Job.queue_name)

          this.Queues[ Job.queue_name ] = Queue
          this.server.log('info', 'Registered job on hapi-queue: ' + Job.queue_name)
        }
      }
    })
  }

  add (job) {
    const new_job = this.createJob(job)
    const Queue = this.getQueue(job)
    return Queue.addJob(new_job)
  }

  createJob (job) {
    const Queue = this.getQueue(job)

    return Queue.createJob({
      data: job.data
    })
  }

  getQueue (job) {
    return this.Queues[ job.queue_name ]
  }
}

module.exports = RethinkDBJobQueue
