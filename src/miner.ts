import { Effect, Stream, Duration, Option } from "effect";

import { MinerWorkTimeExpired, MinerError } from "./errors.ts";
import { AppConfigContext } from "./context.ts";
import { MinerExecArgs } from "./layers.ts";

const toArgs = (flags: Record<string, string | boolean | number>): string[] =>
    Object.entries(flags).flatMap(([key, value]) => {
        if (value === true) return [`--${key}`];
        if (value === false || value === undefined) return [];
        return [`--${key}`, String(value)];
    }
);

const runStreamingMiner = (minerExec: string, minerArgs: string[]) => {
    return Stream.acquireRelease(
        Effect.try({
            try: () => {
                return new Deno.Command(minerExec, {
                    args: minerArgs,
                    stdout: `piped`,
                }).spawn();
            },
            catch: () => new MinerError({
                message: `Failed to start miner ${minerExec}.`
            })
        }),
        (child) => Effect.sync(() => {
            child.kill(`SIGKILL`);
        }).pipe(Effect.ignore) // ignore if already dead
    ).pipe(
        Stream.flatMap((child) => {
            if (!child.stdout) return Stream.fail(new MinerError({ message: `Stdout not available`}));

            return Stream.fromReadableStream(
                () => child.stdout, 
                (e) => new MinerError({ message: `Error ${e}` })
            )            
        }),
        Stream.decodeText(),
        Stream.splitLines
    );
};

export const minerProg = (minerSeed: string, maxRuntimeMs: number) => Effect.gen(function* () {
    const config = yield* AppConfigContext;
    const minerFlags = yield* MinerExecArgs; 

    const minerExecArgs = [
        ...toArgs(minerFlags), 
        `--seed`, minerSeed
    ];

    const minerStream =  runStreamingMiner(config.minerExecPath, minerExecArgs);

    return yield* minerStream.pipe(
        Stream.tap((line) => Effect.log(`${line}`)),
        Stream.filter((line) => line.includes(`Archived`)),
        Stream.map((line) => {
            const match = line.match(/->\s+(.+\.tape)/);
            return match ? Option.some(match[1]) : Option.none();
        }),
        //Stream.filter(Boolean),
        Stream.filterMap((opt) => opt),
        Stream.runHead,
        Effect.flatten, // Some()
        Effect.mapError(() => new MinerError({ message: `Tape file was not created`})),
        Effect.timeoutFail({
            duration: Duration.millis(maxRuntimeMs), 
            onTimeout: () => new MinerWorkTimeExpired({
                message: `Miner exceeded max runtime of ${maxRuntimeMs}ms.`
            })
        }),
        Effect.annotateLogs(`service`, `miner`)
    );
});