import { Cause, Data } from "effect";
import { describe, expect, test } from "vitest";
import { EffectQueryDefect, EffectQueryFailure } from "../../src/core/errors";
import { toEffectQueryError } from "../../src/core/options";

class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}
class Forbidden extends Data.TaggedError("Forbidden")<{
  message: string;
}> {}

describe("toEffectQueryError", () => {
  test("a typed failure becomes an EffectQueryFailure", () => {
    const failure = new NotFound({ id: "1" });
    const cause = Cause.fail(failure);
    const error = toEffectQueryError(cause);

    expect(error).toBeInstanceOf(EffectQueryFailure);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("EffectQueryFailure");
    expect(error._tag).toBe("EffectQueryFailure");
    const typed = error as EffectQueryFailure<NotFound>;
    expect(typed.failure).toBe(failure);
    expect(typed.failureCause).toBe(cause);
    expect(typed.cause).toBe(failure);
  });

  test("the failure message is short and never contains a stack trace", () => {
    const tagOnly = toEffectQueryError(Cause.fail(new NotFound({ id: "1" })));
    const withMessage = toEffectQueryError(
      Cause.fail(new Forbidden({ message: "no access" }))
    );

    expect(tagOnly.message).toBe("NotFound");
    expect(withMessage.message).toBe("Forbidden: no access");
    expect(tagOnly.message).not.toContain("\n");
  });

  test("a defect keeps the original defect", () => {
    const boom = new Error("boom");
    const cause = Cause.die(boom);
    const error = toEffectQueryError(cause);

    expect(error).toBeInstanceOf(EffectQueryDefect);
    expect(error.name).toBe("EffectQueryDefect");
    expect(error.message).toBe("Error: boom");
    const defect = error as EffectQueryDefect;
    expect(defect.defect).toBe(boom);
    expect(defect.cause).toBe(boom);
    expect(defect.defectCause).toBe(cause);
    expect(Cause.squash(defect.defectCause)).toBe(boom);
    expect(defect.interrupted).toBe(false);
  });

  test("a non Error defect is described by its value", () => {
    expect(toEffectQueryError(Cause.die("plain string")).message).toBe(
      "plain string"
    );
  });

  test("an interruption becomes an interrupted EffectQueryDefect", () => {
    const cause = Cause.interrupt(1);
    const error = toEffectQueryError(cause) as EffectQueryDefect;

    expect(error).toBeInstanceOf(EffectQueryDefect);
    expect(error.interrupted).toBe(true);
    expect(error.message).toBe("The Effect was interrupted");
    expect(Cause.hasInterrupts(error.defectCause)).toBe(true);
  });

  test("a failure wins over a concurrent defect", () => {
    const failure = new NotFound({ id: "1" });
    const error = toEffectQueryError(
      Cause.combine(Cause.fail(failure), Cause.die(new Error("boom")))
    ) as EffectQueryFailure<NotFound>;

    expect(error).toBeInstanceOf(EffectQueryFailure);
    expect(error.failure).toBe(failure);
    expect(Cause.hasDies(error.failureCause)).toBe(true);
  });
});

describe("match", () => {
  const notFound = EffectQueryFailure.fromCause(
    new NotFound({ id: "1" }) as NotFound | Forbidden,
    Cause.fail(new NotFound({ id: "1" }) as NotFound | Forbidden)
  );

  test("calls the handler of the failure's tag", () => {
    expect(
      notFound.match({
        NotFound: (failure) => `missing ${failure.id}`,
        OrElse: () => "other",
      })
    ).toBe("missing 1");
  });

  test("falls back to OrElse with the cause when the tag has no handler", () => {
    const result = notFound.match<unknown>({
      Forbidden: () => "forbidden",
      OrElse: (cause) => cause,
    });
    expect(result).toBe(notFound.failureCause);
  });

  test("falls back to OrElse for an untagged failure at runtime", () => {
    const untagged = new EffectQueryFailure(
      "untagged",
      "oops" as unknown as NotFound,
      Cause.fail("oops" as unknown as NotFound)
    );
    expect(
      untagged.match({ NotFound: () => "missing", OrElse: () => "other" })
    ).toBe("other");
  });

  test("a defect always matches OrElse with its own cause", () => {
    const cause = Cause.die(new Error("boom"));
    const defect = EffectQueryDefect.fromCause(cause);
    expect(defect.match({ OrElse: (received) => received })).toBe(cause);
  });
});
