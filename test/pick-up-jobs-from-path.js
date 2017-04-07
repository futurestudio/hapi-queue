'use strict'

const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const Path = require('path');
const SayHelloJob = require('../jobs/SayHelloJob');

const server = new Hapi.Server();
server.connection({port: 3000});

const lab = exports.lab = Lab.script();
const experiment = lab.experiment;
const test = lab.test;
const expect = Code.expect;

experiment('hapi-queue: pick up jobs and prepare Queue for processing', () => {

    lab.before((done) => {

        server.register({
            register: require('../lib/index'),
            options: {
                jobsPath: Path.join(__dirname, '..', 'jobs')
            }
        }, (err) => {

            done(err);
        });
    });

    test('test if plugin is installed with default options', (done) => {

        expect(server.queue).to.exist()
        expect(server.queue._options.redis.host).to.exist()
        expect(server.queue._options.redis.port).to.exist()
        expect(server.queue._options.prefix).to.exist()
        expect(server.queue._options.jobsPath).to.exist()
        done()
    })

    test('test if the plugin works without required options (jobsPath)', (done) => {

        const routeOptions = {
            path: '/',
            method: 'GET',
            handler: (request, reply) => {
                const queue = request.server.queue
                reply({
                    name: queue.name,
                    workers: queue.workers.length
                });
            }
        };

        server.route(routeOptions);

        const options = {
            url: routeOptions.path,
            method: routeOptions.method
        };

        server.inject(options, (response) => {

            const payload = JSON.parse(response.payload || '{}');

            Code.expect(response.statusCode).to.equal(200);
            Code.expect(payload.name).to.equal('kue');
            Code.expect(payload.workers).to.equal(3);

            done();
        });
    });

    test('test that jobs get created', (done) => {

        const routeOptions = {
            path: '/create-job',
            method: 'GET',
            handler: (request, reply) => {
                const job = request.server.createJob(SayHelloJob.create({
                    name: 'Marcus'
                }))

                reply(job);
            }
        };

        server.route(routeOptions);

        const options = {
            url: routeOptions.path,
            method: routeOptions.method
        };

        server.inject(options, (response) => {

            const payload = JSON.parse(response.payload || '{}');

            Code.expect(response.statusCode).to.equal(200);
            Code.expect(payload.type).to.equal('hello');
            Code.expect(payload.data).to.exist();
            Code.expect(payload.data.name).to.equal('Marcus');

            done();
        });
    });

    test('test that jobs get processed', (done) => {

        const routeOptions = {
            path: '/process-job',
            method: 'GET',
            handler: (request, reply) => {
                const job = request.server.createJob(SayHelloJob.create({
                    name: 'Marcus'
                }))

                const saved = request.server.dispatch(job)
                reply(saved);
            }
        };

        server.route(routeOptions);

        const options = {
            url: routeOptions.path,
            method: routeOptions.method
        };

        server.inject(options, (response) => {

            Code.expect(response.statusCode).to.equal(200);

            done();
        });
    });

})
