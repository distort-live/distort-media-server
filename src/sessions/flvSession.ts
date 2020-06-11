import * as url from "url";
import * as context from "../core/context";
import {Session} from "./session";

const NodeCoreUtils = require("../core/utils");

interface IFlvSession {
    header: {
        type: number;
        length: number;
        timestamp: number;
    },
    payload?: any;
}

export default class FlvSession implements Session {
    id: string;
    ip: string;

    req: any;
    res: any;

    connectCmdObj: any;

    streamPath: string = "";
    connectTime: Date;
    playArgs: any;

    isStarting: boolean;
    isPlaying: boolean;
    isIdling: boolean;

    constructor(req, res) {
        this.req = req;
        this.res = res;

        this.id = NodeCoreUtils.generateNewSessionID();
        this.ip = this.req.socket.remoteAddress;

        this.playArgs = null;

        this.isStarting = false;
        this.isPlaying = false;
        this.isIdling = false;

        if (this.req.nmsConnectionType === "ws") {
            this.res.cork = this.res._socket.cork.bind(this.res._socket);
            this.res.uncork = this.res._socket.uncork.bind(this.res._socket);
            this.res.on("close", this.onReqClose.bind(this));
            this.res.on("error", this.onReqError.bind(this));
            this.res.write = this.res.send;
            this.res.end = this.res.close;
        } else {
            this.res.cork = this.res.socket.cork.bind(this.res.socket);
            this.res.uncork = this.res.socket.uncork.bind(this.res.socket);
            this.req.socket.on("close", this.onReqClose.bind(this));
            this.req.on("error", this.onReqError.bind(this));
        }

        context.sessions.set(this.id, this);
    }

    static createFlvTag(packet) {
        let PreviousTagSize = 11 + packet.header.length;
        let tagBuffer = Buffer.alloc(PreviousTagSize + 4);
        tagBuffer[0] = packet.header.type;
        tagBuffer.writeUIntBE(packet.header.length, 1, 3);
        tagBuffer[4] = (packet.header.timestamp >> 16) & 0xff;
        tagBuffer[5] = (packet.header.timestamp >> 8) & 0xff;
        tagBuffer[6] = packet.header.timestamp & 0xff;
        tagBuffer[7] = (packet.header.timestamp >> 24) & 0xff;
        tagBuffer.writeUIntBE(0, 8, 3);
        tagBuffer.writeUInt32BE(PreviousTagSize, PreviousTagSize);
        packet.payload.copy(tagBuffer, 11, 0, packet.header.length);
        return tagBuffer;
    }

    run() {
        let method = this.req.method;
        let urlInfo = url.parse(this.req.url, true);
        let streamPath = urlInfo.pathname.split(".")[0];
        this.connectCmdObj = {ip: this.ip, method, streamPath, query: urlInfo.query};
        this.connectTime = new Date();
        this.isStarting = true;

        context.nodeEvent.emit("preConnect", this.id, this.connectCmdObj);

        if (!this.isStarting) {
            this.stop();
            return;
        }

        context.nodeEvent.emit("postConnect", this.id, this.connectCmdObj);

        if (method === "GET") {
            this.streamPath = streamPath;
            this.playArgs = urlInfo.query;

            this.onPlay();
        }
        this.stop();
    }

    stop() {
        if (this.isStarting) {
            this.isStarting = false;

            let publisherId = context.publishers.get(this.streamPath);
            if (publisherId != null) {
                (context.sessions.get(publisherId) as any).players.delete(this.id);
                context.nodeEvent.emit("donePlay", this.id, this.streamPath, this.playArgs);
            }

            context.nodeEvent.emit("doneConnect", this.id, this.connectCmdObj);

            this.res.end();

            context.idlePlayers.delete(this.id);
            context.sessions.delete(this.id);
        }
    }

    onReqClose() {
        this.stop();
    }

    onReqError(e) {
        this.stop();
    }

    reject() {
        this.stop();
    }

    onPlay() {
        context.nodeEvent.emit("prePlay", this.id, this.streamPath, this.playArgs);
        if (!this.isStarting) return;

        if (!context.publishers.has(this.streamPath)) {
            context.idlePlayers.add(this.id);
            this.isIdling = true;
            return;
        }

        this.onStartPlay();
    }

    onStartPlay() {
        let publisherId = context.publishers.get(this.streamPath);
        let publisher: any = context.sessions.get(publisherId);
        let players = publisher.players;
        players.add(this.id);

        //send FLV header
        let FLVHeader = Buffer.from([0x46, 0x4c, 0x56, 0x01, 0x00, 0x00, 0x00, 0x00, 0x09, 0x00, 0x00, 0x00, 0x00]);
        if (publisher.isFirstAudioReceived) {
            FLVHeader[4] |= 0b00000100;
        }

        if (publisher.isFirstVideoReceived) {
            FLVHeader[4] |= 0b00000001;
        }
        this.res.write(FLVHeader);

        //send Metadata
        if (publisher.metaData != null) {
            let packet = {
                payload: publisher.metaData,
                header: {
                    type: 18,
                    length: publisher.metaData.length as number,
                    timestamp: 0
                }
            } as IFlvSession;

            let tag = FlvSession.createFlvTag(packet);
            this.res.write(tag);
        }

        //send aacSequenceHeader
        if (publisher.audioCodec == 10) {
            let packet = {
                payload: publisher.aacSequenceHeader,
                header: {
                    type: 8,
                    length: publisher.aacSequenceHeader.length as number,
                    timestamp: 0
                }
            } as IFlvSession;
            let tag = FlvSession.createFlvTag(packet);
            this.res.write(tag);
        }

        //send avcSequenceHeader
        if (publisher.videoCodec == 7 || publisher.videoCodec == 12) {
            let packet = {
                payload: publisher.avcSequenceHeader,
                header: {
                    type: 9,
                    length: publisher.avcSequenceHeader.length as number,
                    timestamp: 0
                }
            } as IFlvSession; // FlvPacket.create(publisher.avcSequenceHeader, 9);
            let tag = FlvSession.createFlvTag(packet);
            this.res.write(tag);
        }

        //send gop cache
        if (publisher.flvGopCacheQueue != null) {
            for (let tag of publisher.flvGopCacheQueue) {
                this.res.write(tag);
            }
        }

        this.isIdling = false;
        this.isPlaying = true;

        context.nodeEvent.emit("postPlay", this.id, this.streamPath, this.playArgs);
    }
}