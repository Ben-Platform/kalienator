
import { Data } from "effect";

export class FetchError extends Data.TaggedError("FetchError")<{
    readonly reason: string;
}> {}

export class SeedFormatError extends Data.TaggedError("SeedFormatError")<{
    readonly message: string;
}> {}

export class MissingSeedError extends Data.TaggedError("MissingSeedError")<{
    readonly message: string;
}> {}

export class MinerWorkTimeExpired extends Data.TaggedError("MinerWorkTimeExpired")<{
    readonly message: string;
}> {}

export class MinerError extends Data.TaggedError("MinerError")<{
    readonly message: string;
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
    readonly retryAfterSecs: number;
    readonly message: string;
}> {}

export class SubmitTapeError extends Data.TaggedError("SubmitTapeError")<{
    readonly message: string;
}> {}

export class TapeLoadingError extends Data.TaggedError("TapeLoadingError")<{
    readonly message: string;
}> {}

export class ApiParamsError extends Data.TaggedError("ApiParamsError")<{
    readonly message: string;
}> {}


//