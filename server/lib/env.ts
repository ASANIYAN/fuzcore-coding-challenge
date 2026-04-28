import { parseEnv, type Env } from "./env.schema";

export type { Env };
export const env = parseEnv(process.env);
