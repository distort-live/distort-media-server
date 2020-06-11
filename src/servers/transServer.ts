//
//  Created by Mingliang Chen on 18/3/9.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
import * as context from "../core/context";
import TransSession from "../sessions/transSession";
import Logger from "../core/logger";
import ffmpeg = require('ffmpeg-static');

const {getFFmpegVersion} = require('../core/utils');
const fs = require('fs');
const _ = require('lodash');
const mkdirp = require('mkdirp');

export default class TransServer {
    config: any;
    transSessions: any;

    constructor(config) {
        // @ts-ignore
        this.config = config;
        // @ts-ignore
        this.transSessions = new Map();
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

        let i = this.config.trans.tasks.length;
        let apps = '';
        while (i--) {
            apps += this.config.trans.tasks[i].app;
            apps += ' ';
        }
        context.nodeEvent.on('postPublish', this.onPostPublish.bind(this));
        context.nodeEvent.on('donePublish', this.onDonePublish.bind(this));
        Logger.log(`Node Media Trans Server started for apps: [ ${apps}] , MediaRoot: ${media_root}, ffmpeg version: ${version}`);
    }

    onPostPublish(id, streamPath, args) {
        let regRes = /\/(.*)\/(.*)/gi.exec(streamPath);
        let [app, name] = _.slice(regRes, 1);
        let i = this.config.trans.tasks.length;
        while (i--) {
            let conf = this.config.trans.tasks[i];
            conf.mediaroot = this.config.paths.media_root;
            conf.rtmpPort = this.config.rtmp.port;
            conf.streamPath = streamPath;
            conf.streamApp = app;
            conf.streamName = name;
            conf.args = args;
            if (app === conf.app) {
                let session = new TransSession(conf);
                this.transSessions.set(id, session);
                session.on('end', () => {
                    this.transSessions.delete(id);
                });
                session.run();
            }
        }
    }

    onDonePublish(id, streamPath, args) {
        let session = this.transSessions.get(id);
        if (session) {
            session.end();
        }
    }
}