import { Effect, Match, Fiber, Duration } from "effect";

import { AppConfigMainnet } from "./layers.ts";
import { extractSeedsProg, submitTapeProg } from "./api.ts";
import { handleApiError, handleMinerError, handleRateLimitError } from "./errorHandlers.ts";
import { minerProg } from "./miner.ts";
import { AppConfigContext } from "./context.ts";
import { TapeLoadingError } from "./errors.ts";

const mainProg = Effect.gen(function* () {    
    yield* Effect.gen(function* () {
        const { minerSeed, submitSeed, seedExpiresInSecs } = yield* extractSeedsProg;
        const seedExpiresInMs = seedExpiresInSecs * 1000; 

        yield* Effect.log(`Seed: ${minerSeed}, Expires-In: ${seedExpiresInMs}ms`);
        
        const [totalElapsed, data] = yield* Effect.gen(function* () {
            const resultTape = yield* minerProg(minerSeed, seedExpiresInMs);
            
            yield* Effect.log(`Ready to submit, submit seed: ${submitSeed} with tape: ${resultTape}`);
            
            // submit the tape
            const config = yield* AppConfigContext;

            const tapeBytes = yield* Effect.try({
                try: () => Deno.readFileSync(resultTape),
                catch: (e) => new TapeLoadingError({ message: `Could not load tape. ${e}`})
            });

            return yield* submitTapeProg(tapeBytes, config.playerWalletAddress, submitSeed);
        }).pipe(
            Effect.timed
        );

        const totalElapsedInMs = Duration.toMillis(totalElapsed);
        const waitTimeMs = Math.max(0, seedExpiresInMs - totalElapsedInMs);

        // wait until seed expiration to run again
        yield* Effect.log(`Submitted! Status Url: ${data.statusUrl}`);
        yield* Effect.log(`Work took ${totalElapsedInMs}ms, Waiting ${waitTimeMs}ms for next run`);
        yield* Effect.sleep(Duration.millis(waitTimeMs));
    }).pipe(
        Effect.catchAll((error) => 
            Match.value(error).pipe(
                Match.tag("ConfigError", "TapeLoadingError", (e) => Effect.logFatal(`${e.message}`).pipe(
                    Effect.andThen(Effect.fail(e))
                )),
                Match.tag("FetchError", "MissingSeedError", "SeedFormatError", "SubmitTapeError", "ApiParamsError", handleApiError),
                Match.tag("RateLimitError", handleRateLimitError),
                Match.tag("MinerWorkTimeExpired", "MinerError", handleMinerError),
                Match.exhaustive
            )
        ),
        Effect.forever
    );
});

// Keep the main process alive until the fiber finishes
const runnable = mainProg.pipe(
    Effect.provide(AppConfigMainnet)
)

// Start the program in a "Fiber" (Background Process)
const fiber = Effect.runFork(runnable);
// Graceful Shutdown Logic
const shutdown = () => {
    Effect.log("[Supervisor]: Shutdown signal received. Cleaning up...");
    Effect.runPromise(Fiber.interrupt(fiber)).then(() => {
        Effect.log("[Supervisor]: All workers stopped. Goodbye!");
        Deno.exit(0);
    });
};

Deno.addSignalListener("SIGINT", shutdown);

await Fiber.join(fiber);