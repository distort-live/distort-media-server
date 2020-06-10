//
//  Created by Mingliang Chen on 17/8/1.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//

import * as net from "net";

import * as Logger from "../core/logger";

import Context from "../core/context";
import RtmpSession from "../sessions/rtmpSession";

const RTMP_PORT = 1935;

export default class RtmpServer {
    port: number;

    tcpServer: net.Server;

    constructor(config) {
        config.rtmp.port = this.port = config.rtmp.port ? config.rtmp.port : RTMP_PORT;
        this.tcpServer = net.createServer((socket) => {
            let session = new RtmpSession(config, socket);
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

        Context.sessions.forEach((session, id) => {
            if (session instanceof RtmpSession)
                session.stop();
        });
    }
}