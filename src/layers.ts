import { Effect, Layer, Config } from "effect";

import { AppConfigContext } from "./context.ts";

export const MinerExecArgs = Config.all({
    // miner exec opts
    out: Config.string("OUT").pipe(Config.withDefault("./bin/tapes/single")),
    beam: Config.number("BEAM").pipe(Config.withDefault(4096)),
    horizon: Config.number("HORIZON").pipe(Config.withDefault(21)),
    frames: Config.number("FRAMES").pipe(Config.withDefault(36000)),
    cpu: Config.boolean("CPU").pipe(Config.withDefault(true)),
    wave: Config.number("WAVE").pipe(Config.withDefault(7)),
});

const configTemplate = Config.all({
    apiUrl: Config.string(`API_URL`).pipe(Config.withDefault(`https://kalien.xyz/api`)),
    apiFetchTimeoutSecs: Config.number(`API_FETCH_TIMEOUT_SECS`).pipe(Config.withDefault(30)),
    minerExecPath: Config.string(`MINER_EXEC_PATH`).pipe(Config.withDefault(`./bin/kalien`)), 
    minerExecArgs: MinerExecArgs, 
    playerWalletAddress: Config.string(`PLAYER_ADDRESS`), 
});

export const AppConfigMainnet = Layer.effect(
    AppConfigContext, 
    configTemplate.pipe(
        Effect.andThen(AppConfigContext.of)
    )
);