//
//  Created by Mingliang Chen on 17/8/1.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//

import * as Logger from "../core/logger";

import NodeRtmpServer from "./rtmpServer";
import NodeHttpServer from "./httpServer";
import NodeTransServer from "./transServer";
import NodeRelayServer from "./relayServer";

import Context from "../core/context";

export default class NodeMediaServer {
    config: any;

    nrs: NodeRtmpServer;
    nhs: NodeHttpServer;
    nts: NodeTransServer;
    nls: NodeRelayServer;

    constructor(config) {
        this.config = config;
    }

    run() {
        Logger.setLogType(this.config.logType);

        if (this.config.rtmp) {
            this.nrs = new NodeRtmpServer(this.config);
            this.nrs.run();
        }

        if (this.config.http) {
            this.nhs = new NodeHttpServer(this.config);
            this.nhs.run();
        }

        if (this.config.trans) {
            if (this.config.cluster) {
                Logger.log('NodeTransServer does not work in cluster mode');
            } else {
                this.nts = new NodeTransServer(this.config);
                this.nts.run();
            }
        }

        if (this.config.relay) {
            if (this.config.cluster) {
                Logger.log('NodeRelayServer does not work in cluster mode');
            } else {
                this.nls = new NodeRelayServer(this.config);
                this.nls.run();
            }
        }

        process.on('uncaughtException', function (err) {
            Logger.error('uncaughtException', err);
        });
    }

    on(eventName: string, listener) {
        Context.nodeEvent.on(eventName, listener);
    }

    stop() {
        if (this.nrs) this.nrs.stop();
        if (this.nhs) this.nhs.stop();
        if (this.nls) this.nls.stop();
    }
}