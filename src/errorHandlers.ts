import { Duration, Effect, Match } from "effect";
import { FetchError, MissingSeedError, SeedFormatError, MinerWorkTimeExpired, MinerError, SubmitTapeError, RateLimitError, ApiParamsError } from "./errors.ts";

export const handleApiError = (error: FetchError | MissingSeedError | SeedFormatError | SubmitTapeError | ApiParamsError) => 
    Match.value(error).pipe(
        Match.tag("FetchError", (e) => Effect.logWarning(`failed to fetch seed: ${e.reason}`)),
        Match.tag("MissingSeedError", (e) => Effect.logWarning(`seed not found: ${e.message}`)),
        Match.tag("SeedFormatError", (e) => Effect.logError(`seed data error ${e.message}`)),
        Match.tag("SubmitTapeError", (e) => Effect.logWarning(`failed to submit: ${e.message}`)),
        Match.tag("ApiParamsError", (e) => Effect.logFatal(`api error: ${e.message}`).pipe(
            Effect.andThen(Effect.fail(e))
        )),
        Match.exhaustive, 
        Effect.annotateLogs(`service`, `API`)
    );

export const handleMinerError = (error: MinerWorkTimeExpired | MinerError) =>
    Match.value(error).pipe(
        Match.tag("MinerWorkTimeExpired", (e) => Effect.logInfo(`seed expired: ${e.message}`)),
        Match.tag("MinerError", (e) => Effect.logFatal(`miner failed: ${e.message}`).pipe(
            Effect.andThen(Effect.fail(e))
        )),
        Match.exhaustive, 
        Effect.annotateLogs(`service`, `miner`)
    );

export const handleRateLimitError = (error: RateLimitError) => 
    Effect.gen(function* () {
        const waitTimeSecs = error.retryAfterSecs ?? 60;

        yield* Effect.logWarning(`Rate limited. Waiting ${waitTimeSecs}`);

        yield* Effect.sleep(Duration.millis(waitTimeSecs * 1000))
    }).pipe(
        Effect.annotateLogs(`service`, `rate-limiter`)
    );
