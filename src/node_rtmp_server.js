//
//  Created by Mingliang Chen on 17/8/1.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require('./core/logger');

const Net = require('net');
const NodeRtmpSession = require('./node_rtmp_session');

const context = require('./core/context');

const RTMP_PORT = 1935;

export default class NodeRtmpServer {
    constructor(config) {
        config.rtmp.port = this.port = config.rtmp.port ? config.rtmp.port : RTMP_PORT;
        this.tcpServer = Net.createServer((socket) => {
            let session = new NodeRtmpSession(config, socket);
            session.run();
        });
    }

    run() {
        this.tcpServer.listen(this.port, () => {
            Logger.log(`Node Media Rtmp Server started on port: ${this.port}`);
        });

        this.tcpServer.on('error', (e) => {
            Logger.error(`Node Media Rtmp Server ${e}`);
        });

        this.tcpServer.on('close', () => {
            Logger.log('Node Media Rtmp Server Close.');
        });
    }

    stop() {
        this.tcpServer.close();
        context.sessions.forEach((session, id) => {
            if (session instanceof NodeRtmpSession)
                session.stop();
        });
    }
}