import type { Cause } from "effect";

// biome-ignore lint/suspicious/noExplicitAny: Generic type for cause
export class EffectQueryError<TCause extends Cause.Cause<any>> extends Error {
	override readonly cause: TCause;
	constructor(message: string, cause: TCause) {
		super(message);
		this.cause = cause;
	}
}
