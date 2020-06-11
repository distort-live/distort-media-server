import {EventEmitter} from "events";
import {Session} from "../sessions/Session";

let sessions = new Map<string, Session>();
let publishers = new Map<string, string>();
let idlePlayers = new Set();

let nodeEvent = new EventEmitter();
let stat = {
    inbytes: 0,
    outbytes: 0,
    accepted: 0
};

export default {
    sessions,
    publishers,
    idlePlayers,
    nodeEvent: nodeEvent,
    stat
};
