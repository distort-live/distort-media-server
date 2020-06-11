import * as context from "./context";

const Crypto = require('crypto');
const {spawn} = require('child_process');

function generateNewSessionID() {
    let sessionID = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWKYZ0123456789';
    const numPossible = possible.length;
    do {
        for (let i = 0; i < 8; i++) {
            sessionID += possible.charAt((Math.random() * numPossible) | 0);
        }
    } while (context.sessions.has(sessionID))
    return sessionID;
}

function genRandomName() {
    let name = '';
    const possible = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const numPossible = possible.length;
    for (let i = 0; i < 4; i++) {
        name += possible.charAt((Math.random() * numPossible) | 0);
    }

    return name;
}

function verifyAuth(signStr, streamId, secretKey) {
    if (signStr === undefined) {
        return false;
    }
    let now = Date.now() / 1000 | 0;
    let exp = parseInt(signStr.split('-')[0]);
    let shv = signStr.split('-')[1];
    let str = streamId + '-' + exp + '-' + secretKey;
    if (exp < now) {
        return false;
    }
    let md5 = Crypto.createHash('md5');
    let ohv = md5.update(str).digest('hex');
    return shv === ohv;
}

function getFFmpegVersion(ffpath) {
    return new Promise((resolve, reject) => {
        let ffmpeg_exec = spawn(ffpath, ['-version']);
        let version = '';
        ffmpeg_exec.on('error', (e) => {
            reject(e);
        });
        ffmpeg_exec.stdout.on('data', (data) => {
            try {
                version = data.toString().split(/(?:\r\n|\r|\n)/g)[0].split('\ ')[2];
            } catch (e) {
            }
        });
        ffmpeg_exec.on('close', (code) => {
            resolve(version);
        });
    });
}

export = {
    generateNewSessionID,
    verifyAuth,
    genRandomName,
    getFFmpegVersion
}
