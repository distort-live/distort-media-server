import chalk from "chalk";

import {LogType} from "../config";

let logType = LogType.Debug;

const setLogType = (type: LogType) => {
    if (typeof type !== 'number') return;

    logType = type;
};

const logTime = () => {
    let nowDate = new Date();
    return nowDate.toLocaleDateString() + ' ' + nowDate.toLocaleTimeString([], {hour12: false});
};

const log = (...args) => {
    if (logType < LogType.Normal) return;

    console.log(logTime(), process.pid, chalk.bold.green('[INFO]'), ...args);
};

const error = (...args) => {
    if (logType < LogType.Errors) return;

    console.log(logTime(), process.pid, chalk.bold.red('[ERROR]'), ...args);
};

const debug = (...args) => {
    if (logType < LogType.Debug) return;

    console.log(logTime(), process.pid, chalk.bold.blue('[DEBUG]'), ...args);
};

const ffdebug = (...args) => {
    if (logType < LogType.FFDebug) return;

    console.log(logTime(), process.pid, chalk.bold.blue('[FFDEBUG]'), ...args);
};

export default {
    setLogType,

    log,
    error,
    debug,
    ffdebug
}
