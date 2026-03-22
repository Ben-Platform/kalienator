import { Schema } from "effect";

export interface MinerExecArgs {
    readonly out: string;
    readonly beam: number;
    readonly horizon: number;
    readonly frames: number;
    readonly cpu: boolean;
    readonly wave: number;
}

export interface AppConfig {
    readonly apiUrl: string;
    readonly apiFetchTimeoutSecs: number;
    readonly minerExecPath: string;
    readonly minerExecArgs: MinerExecArgs;
    readonly playerWalletAddress: string;    
};

export const SeedsResponseSchema = Schema.Struct({
    seed: Schema.Number, 
    seed_id: Schema.Number, 
    seconds_left: Schema.Number, 
});

export interface SeedsSchema extends Schema.Schema.Type<typeof SeedsResponseSchema> {}

export const SubmitTapeResponseSchema = Schema.Struct({
    job: Schema.optional(
        Schema.Struct({ jobId: Schema.String })
    ), 
    status_url: Schema.String
})

export interface SubmitTapeSchema extends Schema.Schema.Type<typeof SubmitTapeResponseSchema> {}