//
//  Created by Mingliang Chen on 18/3/9.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//

import * as fs from "fs";
import * as mkdirp from "mkdirp";

import * as _ from "lodash";

import TransSession from "../sessions/transSession";
import Logger from "../core/logger";
import ffmpeg = require('ffmpeg-static');

import * as context from "../core/context";
import IConfig from "../config";

const {getFFmpegVersion} = require('../core/utils');

export default class TransServer {
    private readonly config: IConfig;
    private sessions: Map<string, TransSession> = new Map<string, TransSession>();

    constructor(config: IConfig) {
        this.config = config;
    }

    async run() {
        const media_root = this.config.paths.media_root;

        try {
            mkdirp.sync(media_root);
            fs.accessSync(media_root, fs.constants.W_OK);
        } catch (error) {
            Logger.error(`Node Media Trans Server startup failed. MediaRoot:${media_root} cannot be written.`);
            return;
        }

        try {
            fs.accessSync(ffmpeg, fs.constants.X_OK);
        } catch (error) {
            Logger.error(`Node Media Trans Server startup failed. ffmpeg:${ffmpeg} cannot be executed.`);
            return;
        }

        let version = await getFFmpegVersion(ffmpeg);
        if (version === '' || parseInt(version.split('.')[0]) < 4) {
            Logger.error(`Node Media Trans Server startup failed. ffmpeg requires version 4.0.0 above`);
            return;
        }

        context.nodeEvent.on('postPublish', this.onPostPublish.bind(this));
        context.nodeEvent.on('donePublish', this.onDonePublish.bind(this));

        Logger.log(`Node Media Trans Server started with ffmpeg version: ${version}`);
    }

    async getStreamName(key: string): Promise<string> {
        return (this.config.trans.nameResolver) ? (await this.config.trans.nameResolver(key)) : key;
    }

    onPostPublish(id: string, streamPath: string, args) {
        let regRes = /\/(.*)\/(.*)/gi.exec(streamPath);
        let [app, key] = _.slice(regRes, 1);

        let i = this.config.trans.tasks.length;

        while (i--) {
            let config = this.config;
            let conf = this.config.trans.tasks[i];
            this.getStreamName(key).then(streamName => {
                conf.mediaroot = config.paths.media_root;
                conf.rtmpPort = config.rtmp.port;
                conf.streamPath = streamPath;
                conf.streamApp = app;
                conf.streamName = streamName;
                conf.args = args;

                if (app === conf.app) {
                    let session = new TransSession(conf);
                    this.sessions.set(id, session);
                    session.on('end', () => {
                        this.sessions.delete(id);
                    });
                    session.run();
                }
            });
        }
    }

    onDonePublish(id: string, streamPath: string, args) {
        let session = this.sessions.get(id);
        if (session) session.end();
    }
}