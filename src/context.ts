import { Context } from "effect";
import { AppConfig } from "./schemas.ts";

export const AppConfigContext = Context.GenericTag<AppConfig>("AppConfig");