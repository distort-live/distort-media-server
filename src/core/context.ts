import {EventEmitter} from "events";
import {Session} from "../sessions/session";

let sessions = new Map<string, Session>();
let publishers = new Map<string, string>();
let idlePlayers = new Set<string>();
let nodeEvent = new EventEmitter();
let stat = {
    inbytes: 0,
    outbytes: 0,
    accepted: 0
};

export {
    sessions,
    publishers,
    idlePlayers,
    nodeEvent,
    stat
};
