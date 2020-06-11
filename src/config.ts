type NameResolverFunction = (key: string) => Promise<string>;

export enum LogType {
    None,
    Errors,
    Normal,
    Debug,
    FFDebug
}

export default interface IConfig {
    logType: LogType,
    cluster: boolean,
    paths: {
        media_root: string;
        web_root: string;
    },
    http?: {
        port?: number;
        allow_origin: boolean;
    },
    https?: {
        port?: number;

        key: string;
        cert: string;
    },
    relay: {

    },
    trans: {
        nameResolver?: NameResolverFunction;
        tasks: Array<any>;
    },
    rtmp: {
        port: number
    }
}