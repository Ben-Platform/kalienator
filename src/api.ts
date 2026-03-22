import { Effect, Schedule, Schema } from "effect";

import { AppConfigContext } from "./context.ts";
import { FetchError, SeedFormatError, MissingSeedError, RateLimitError, SubmitTapeError, ApiParamsError } from "./errors.ts";
import { SeedsResponseSchema, SeedsSchema, SubmitTapeResponseSchema } from "./schemas.ts";

const getApiData = (url: string) => Effect.tryPromise({
    try: async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Status: ${res.status}`);

        return await res.json();
    },
    catch: (e) => new FetchError({ reason: String(e) }),
});

const retryPolicy = Schedule.exponential("3 seconds").pipe(
    Schedule.intersect(Schedule.recurs(5)), 
    Schedule.tapOutput((count) => Effect.logWarning(`Retry attempt #${count} in progress...`))
);

export const managedFetchProg = AppConfigContext.pipe(
    Effect.andThen((config) => getApiData(`${config.apiUrl}/seed/current`).pipe(
        Effect.timeoutFail({ duration: "60 seconds", onTimeout: () => new FetchError({ reason: `Fetch timeout`} )})
    )), 
    Effect.tap((json) => Effect.logDebug(`Raw API Response: ${JSON.stringify(json)}`)),
    Effect.filterOrFail((json => json.seed !== null), () => new MissingSeedError({ message: `Seed is null`})),
    Effect.retry(retryPolicy),
);

const toMinerSeeds = (seeds: SeedsSchema) => ({
    minerSeed: `0x${seeds.seed.toString(16).toUpperCase()}`, 
    submitSeed: String(seeds.seed_id >>> 0),
    seedExpiresInSecs: seeds.seconds_left,
});

export const extractSeedsProg = managedFetchProg.pipe(
    Effect.andThen(Schema.decodeUnknown(SeedsResponseSchema)),
    Effect.andThen(toMinerSeeds),
    Effect.catchTag("ParseError", (e) => Effect.fail(new SeedFormatError(e)))
);

const postTapeBytes = (tapeBytes: Uint8Array, submitUrl: string) => 
    Effect.tryPromise({
        try: () => fetch(submitUrl, {
            method: "POST", 
            headers: { "content-type": "application/octet-stream" }, 
            body: tapeBytes, 
        }),
        catch: (e) => new SubmitTapeError({ message: e instanceof Error ? e.message : String(e) })
    }).pipe(
        Effect.filterOrFail((res) => res.status !== 429, (res) => {
            const retryAfter = res.headers.get("Retry-After");
            return new RateLimitError({ 
                retryAfterSecs: retryAfter ? parseInt(retryAfter, 10) : 60,
                message: `Too many requests`
            })}
        ),
        Effect.filterOrFail((res) => res.ok, (res) => 
            new ApiParamsError({ message: `HTTP ${res.status}: ${res.statusText}` })
        )
    );


export const submitTapeProg = (tapeBytes: Uint8Array, playerWalletAddress: string, submitSeed: string) => Effect.gen(function* () {
    const params = new URLSearchParams({
        seed_id: submitSeed,
        claimant: playerWalletAddress, 
    });

    const config = yield* AppConfigContext;
    
    const submitUrl = `${config.apiUrl}/proofs/jobs?${params.toString()}`;

    const response = yield* postTapeBytes(tapeBytes, submitUrl);

    const data = yield* Effect.tryPromise({
        try: () => response.json(),
        catch: () => new SubmitTapeError({ message: "Failed to parse success response" })
    }).pipe(
        Effect.andThen(Schema.decodeUnknown(SubmitTapeResponseSchema)),
        Effect.mapError(() => new SubmitTapeError({message: `API response mismatch`})),
        Effect.annotateLogs(`service`, `API`)
    );

    return {
        jobId: data.job?.jobId, 
        statusUrl: data.status_url,
    };
});
