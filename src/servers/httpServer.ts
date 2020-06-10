//
//  Created by Mingliang Chen on 17/8/1.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//


import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";

import * as express from "express";

import * as WebSocket from "ws";

const bodyParser = require('body-parser');
const basicAuth = require('basic-auth-connect');
const NodeFlvSession = require('../sessions/flvSession');

const Logger = require('../core/logger');
const context = require('../core/context');

const HTTP_PORT = 80;
const HTTPS_PORT = 443;
const HTTP_MEDIA_ROOT = './media';

const streamsRoute = require('../api/routes/streams');
const serverRoute = require('../api/routes/server');
const relayRoute = require('../api/routes/relay');

export default class NodeHttpServer {
    port: number;
    sport: number; // HTTPS порт
    config: any;

    mediaRoot: string;

    nmsConnectionType: string;

    wsServer: WebSocket.Server;
    httpServer: http.Server;
    httpsServer: https.Server;

    constructor(config) {
        this.port = config.http.port || HTTP_PORT;
        this.mediaRoot = config.paths.media_root || HTTP_MEDIA_ROOT;
        this.config = config;

        let app = express();

        app.use(bodyParser.urlencoded({extended: true}));

        app.all('*', (req, res, next) => {
            res.header("Access-Control-Allow-Origin", this.config.http.allow_origin);
            res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
            res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
            res.header("Access-Control-Allow-Credentials", true);
            req.method === "OPTIONS" ? res.sendStatus(200) : next();
        });

        app.get('*.flv', (req, res, next) => {
            req.nmsConnectionType = 'http';
            this.onConnect(req, res);
        });

        if (this.config.http.api !== false) {
            if (this.config.auth && this.config.auth.api) {
                app.use(['/api/*', '/static/*', '/admin/*'], basicAuth(this.config.auth.api_user, this.config.auth.api_pass));
            }
            app.use('/api/streams', streamsRoute(context));
            app.use('/api/server', serverRoute(context));
            app.use('/api/relay', relayRoute(context));
        }

        app.use(express.static(path.join(__dirname + '/public')));
        app.use(express.static(this.mediaRoot));
        if (config.paths.web_root) {
            app.use(express.static(config.paths.web_root));
        }

        this.httpServer = http.createServer(app);

        /**
         * ~ openssl genrsa -out privatekey.pem 1024
         * ~ openssl req -new -key privatekey.pem -out certrequest.csr
         * ~ openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
         */
        if (this.config.https) {
            this.sport = config.https.port ? config.https.port : HTTPS_PORT;
            this.httpsServer = https.createServer({
                key: fs.readFileSync(this.config.https.key),
                cert: fs.readFileSync(this.config.https.cert)
            }, app);
        }
    }

    run() {
        this.httpServer.listen(this.port, () => {
            Logger.log(`Node Media Http Server started on port: ${this.port}`);
        });

        this.httpServer.on('error', (e) => {
            Logger.error(`Node Media Http Server ${e}`);
        });

        this.httpServer.on('close', () => {
            Logger.log('Node Media Http Server Close.');
        });

        this.wsServer = new WebSocket.Server({server: this.httpServer});

        this.wsServer.on('connection', (ws, req) => {
            // @ts-ignore
            req.nmsConnectionType = 'ws'; // FIXME: Ещё один костыль
            this.onConnect(req, ws);
        });

        this.wsServer.on('listening', () => {
            Logger.log(`Node Media WebSocket Server started on port: ${this.port}`);
        });
        this.wsServer.on('error', (e) => {
            Logger.error(`Node Media WebSocket Server ${e}`);
        });

        if (this.httpsServer) {
            this.httpsServer.listen(this.sport, () => {
                Logger.log(`Node Media Https Server started on port: ${this.sport}`);
            });

            this.httpsServer.on('error', (e) => {
                Logger.error(`Node Media Https Server ${e}`);
            });

            this.httpsServer.on('close', () => {
                Logger.log('Node Media Https Server Close.');
            });

            this.wsServer = new WebSocket.Server({server: this.httpsServer});

            this.wsServer.on('connection', (ws, req) => {
                // @ts-ignore
                req.nmsConnectionType = 'ws'; // FIXME: Костыль
                this.onConnect(req, ws);
            });

            this.wsServer.on('listening', () => {
                Logger.log(`Node Media WebSocketSecure Server started on port: ${this.sport}`);
            });
            this.wsServer.on('error', (e) => {
                Logger.error(`Node Media WebSocketSecure Server ${e}`);
            });
        }

        context.nodeEvent.on('postPlay', (id, args) => {
            context.stat.accepted++;
        });

        context.nodeEvent.on('postPublish', (id, args) => {
            context.stat.accepted++;
        });

        context.nodeEvent.on('doneConnect', (id, args) => {
            let session = context.sessions.get(id);
            let socket = session instanceof NodeFlvSession ? session.req.socket : session.socket;
            context.stat.inbytes += socket.bytesRead;
            context.stat.outbytes += socket.bytesWritten;
        });
    }

    stop() {
        this.httpServer.close();
        if (this.httpsServer) {
            this.httpsServer.close();
        }
        context.sessions.forEach((session, id) => {
            if (session instanceof NodeFlvSession) {
                session.req.destroy();
                context.sessions.delete(id);
            }
        });
    }

    onConnect(req, res) {
        let session = new NodeFlvSession(this.config, req, res);
        session.run();
    }
}