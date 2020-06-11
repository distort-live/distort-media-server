//
//  Created by Mingliang Chen on 18/3/9.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
import * as fs from "fs";

import * as mkdirp from "mkdirp";
import * as dateFormat from "dateformat";

import Logger from "../core/logger";

import {EventEmitter} from "events";

import {ChildProcessWithoutNullStreams, spawn} from "child_process";
import {Session} from "./Session";

export default class TransSession extends EventEmitter implements Session {
    config: any;

    ffmpeg_exec: ChildProcessWithoutNullStreams;

    constructor(config) {
        super();

        this.config = config;
    }

    stop() {
        throw new Error("Method not implemented.");
    }
    reject() {
        throw new Error("Method not implemented.");
    }

    run() {
        let vc = this.config.vc || 'copy';
        let ac = this.config.ac || 'copy';
        let inPath = 'rtmp://127.0.0.1:' + this.config.rtmpPort + this.config.streamPath;
        let ouPath = `${this.config.mediaroot}/${this.config.streamApp}/${this.config.streamName}`;
        let mapStr = '';

        if (this.config.rtmp && this.config.rtmpApp) {
            if (this.config.rtmpApp === this.config.streamApp) {
                Logger.error('[Transmuxing RTMP] Cannot output to the same app.');
            } else {
                let rtmpOutput = `rtmp://127.0.0.1:${this.config.rtmpPort}/${this.config.rtmpApp}/${this.config.streamName}`;
                mapStr += `[f=flv]${rtmpOutput}|`;
                Logger.log('[Transmuxing RTMP] ' + this.config.streamPath + ' to ' + rtmpOutput);
            }
        }
        if (this.config.mp4) {
            this.config.mp4Flags = this.config.mp4Flags ? this.config.mp4Flags : '';
            let mp4FileName = dateFormat('yyyy-mm-dd-HH-MM') + '.mp4';
            let mapMp4 = `${this.config.mp4Flags}${ouPath}/${mp4FileName}|`;
            mapStr += mapMp4;
            Logger.log('[Transmuxing MP4] ' + this.config.streamPath + ' to ' + ouPath + '/' + mp4FileName);
        }
        if (this.config.hls) {
            this.config.hlsFlags = this.config.hlsFlags ? this.config.hlsFlags : '';
            let hlsFileName = 'index.m3u8';
            let mapHls = `${this.config.hlsFlags}${ouPath}/${hlsFileName}|`;
            mapStr += mapHls;
            Logger.log('[Transmuxing HLS] ' + this.config.streamPath + ' to ' + ouPath + '/' + hlsFileName);
        }
        if (this.config.dash) {
            this.config.dashFlags = this.config.dashFlags ? this.config.dashFlags : '';
            let dashFileName = 'index.mpd';
            let mapDash = `${this.config.dashFlags}${ouPath}/${dashFileName}`;
            mapStr += mapDash;
            Logger.log('[Transmuxing DASH] ' + this.config.streamPath + ' to ' + ouPath + '/' + dashFileName);
        }
        mkdirp.sync(ouPath);
        let argv = ['-y', '-fflags', 'nobuffer', '-i', inPath];
        Array.prototype.push.apply(argv, ['-c:v', vc]);
        Array.prototype.push.apply(argv, this.config.vcParam);
        Array.prototype.push.apply(argv, ['-c:a', ac]);
        Array.prototype.push.apply(argv, this.config.acParam);
        Array.prototype.push.apply(argv, ['-f', 'tee', '-map', '0:a?', '-map', '0:v?', mapStr]);
        argv = argv.filter((n) => {
            return n
        }); //去空
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
            Logger.log('[Transmuxing end] ' + this.config.streamPath);
            this.emit('end');
            fs.readdir(ouPath, function (err, files) {
                if (!err) {
                    files.forEach((filename) => {
                        if (filename.endsWith('.ts')
                            || filename.endsWith('.m3u8')
                            || filename.endsWith('.mpd')
                            || filename.endsWith('.m4s')
                            || filename.endsWith('.tmp')) {
                            fs.unlinkSync(ouPath + '/' + filename);
                        }
                    })
                }
            });
        });
    }

    end() {
        // this.ffmpeg_exec.kill();
    }
}