//
//  Created by Mingliang Chen on 18/3/16.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
import * as Logger from "../core/logger";
import {EventEmitter} from "events";
import {ChildProcessWithoutNullStreams} from "child_process";

const NodeCoreUtils = require("../core/utils");

const {spawn} = require('child_process');

const RTSP_TRANSPORT = ['udp', 'tcp', 'udp_multicast', 'http'];

// const TAG = "relay";

export default class NodeRelaySession extends EventEmitter {
    id: string;
    config: any;

    ffmpeg_exec: ChildProcessWithoutNullStreams;

    constructor(config) {
        super();

        this.config = config;
        this.id = NodeCoreUtils.generateNewSessionID();
    }

    run() {
        let format = this.config.ouPath.startsWith('rtsp://') ? 'rtsp' : 'flv';
        let argv = ['-fflags', 'nobuffer', '-i', this.config.inPath, '-c', 'copy', '-f', format, this.config.ouPath];
        if (this.config.inPath[0] === '/' || this.config.inPath[1] === ':') {
            argv.unshift('-1');
            argv.unshift('-stream_loop');
            argv.unshift('-re');
        }

        if (this.config.inPath.startsWith('rtsp://') && this.config.rtsp_transport) {
            if (RTSP_TRANSPORT.indexOf(this.config.rtsp_transport) > -1) {
                argv.unshift(this.config.rtsp_transport);
                argv.unshift('-rtsp_transport');
            }
        }

        Logger.ffdebug(argv.toString());
        this.ffmpeg_exec = spawn(this.config.ffmpeg, argv);
        this.ffmpeg_exec.on('error', (e) => {
            Logger.ffdebug(e);
        });

        this.ffmpeg_exec.stdout.on('data', (data) => {
            Logger.ffdebug(`FF输出：${data}`);
        });

        this.ffmpeg_exec.stderr.on('data', (data) => {
            Logger.ffdebug(`FF输出：${data}`);
        });

        this.ffmpeg_exec.on('close', (code) => {
            Logger.log('[Relay end] id=', this.id);
            this.emit('end', this.id);
        });
    }

    end() {
        this.ffmpeg_exec.kill();
    }
}