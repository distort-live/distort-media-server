type NameResolverFunction = (key: string) => Promise<string>;

export default interface IConfig {
    paths: {
        media_root: string;
    },
    trans: {
        nameResolver?: NameResolverFunction;
        tasks: Array<any>;
    },
    rtmp: {
        port: number
    }
}