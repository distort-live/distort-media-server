//
//  Created by Mingliang Chen on 17/8/1.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//

import Logger from "../core/logger";

import RtmpServer from "./rtmpServer";
import HttpServer from "./httpServer";
import TransServer from "./transServer";
import RelayServer from "./relayServer";

import * as Context from "../core/context";

export default class MediaServer {
    config: any;

    nrs: RtmpServer;
    nhs: HttpServer;
    nts: TransServer;
    nls: RelayServer;

    constructor(config) {
        this.config = config;
    }

    run() {
        Logger.setLogType(this.config.logType);

        if (this.config.rtmp) {
            this.nrs = new RtmpServer(this.config);
            this.nrs.run();
        }

        if (this.config.http) {
            this.nhs = new HttpServer(this.config);
            this.nhs.run();
        }

        if (this.config.trans) {
            if (this.config.cluster) {
                Logger.log('NodeTransServer does not work in cluster mode');
            } else {
                this.nts = new TransServer(this.config);
                this.nts.run();
            }
        }

        if (this.config.relay) {
            if (this.config.cluster) {
                Logger.log('NodeRelayServer does not work in cluster mode');
            } else {
                this.nls = new RelayServer(this.config);
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