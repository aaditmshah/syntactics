import type { ParserResult, Parser } from "./parsers";
import { pure, map, alt, fail, read, fix, begin, next } from "./parsers";

const parse = <E, R>(
  parser: Parser<string, E, R>,
  input: string
): ParserResult<E, R> => {
  let state = begin(parser);

  for (const char of input) {
    const { result, continuations } = state;
    if (continuations === null) return result;
    state = next(continuations, char);
  }

  return state.result;
};

interface ParseError {
  expected: string;
  received: string;
}

const char = (expected: string): Parser<string, ParseError, string> =>
  read((received) =>
    received === expected ? pure(received) : fail({ expected, received })
  );

const { ba } = fix<string, ParseError, { ba: string }>({
  ba: ({ ba }) =>
    alt(
      pure(""),
      map((string, b) => `${string}${b}`, ba, char("b")),
      map((string, a) => `${string}${a}`, ba, char("a"))
    )
});

const { ab } = fix<string, ParseError, { ab: string }>({
  ab: ({ ab }) =>
    alt(
      pure(""),
      map((a, string, b) => `${a}${string}${b}`, char("a"), ab, char("b"))
    )
});

const { abb } = fix<string, ParseError, { abb: string }>({
  abb: ({ abb }) =>
    alt(
      pure(""),
      map(
        (a, string, b1, b2) => `${a}${string}${b1}${b2}`,
        char("a"),
        abb,
        char("b"),
        char("b")
      )
    )
});

const abbb = alt(ab, abb);

describe("syntactics", () => {
  it("should correctly parse left recursive grammars", () => {
    expect.assertions(1);
    expect(parse(ba, "abba")).toStrictEqual({
      success: true,
      values: { head: "abba", tail: null }
    });
  });

  it("should correctly parse non-deterministic grammars", () => {
    expect.assertions(2);
    expect(parse(abbb, "aaabbb")).toStrictEqual({
      success: true,
      values: { head: "aaabbb", tail: null }
    });
    expect(parse(abbb, "aabbbb")).toStrictEqual({
      success: true,
      values: { head: "aabbbb", tail: null }
    });
  });
});
