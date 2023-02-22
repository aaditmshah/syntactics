import type { Parser } from "./parsers";
import { pure, map, alt, fail, read, fix, begin, next } from "./parsers";

interface ParseError {
  expected: string;
  received: string;
}

type StringParser<A> = Parser<string, ParseError, A>;

const text = (input: string) => {
  const { length } = input;

  const loop = (index: number): StringParser<string> =>
    index === length
      ? pure(input)
      : read((received) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- never null
          const codePoint = input.codePointAt(index)!;
          const expected = String.fromCodePoint(codePoint);
          if (received !== expected) return fail({ expected, received });
          return loop(
            codePoint < 0x1_00_00
              ? index + 1
              : /* istanbul ignore next */ index + 2
          );
        });

  return loop(0);
};

const oneOf = (input: string): StringParser<string> =>
  read((received) =>
    input.includes(received)
      ? pure(received)
      : fail({ expected: `oneOf ${input}`, received })
  );

const concat = (...parts: string[]) => {
  let result = "";
  for (const part of parts) result += part;
  return result;
};

const { whitespace } = fix<string, ParseError, { whitespace: string }>({
  whitespace: ({ whitespace }) =>
    alt(pure(""), map(concat, whitespace, oneOf(" \n\r\t")))
});

const onenine = oneOf("123456789");

const digit = oneOf("0123456789");

const { digits } = fix<string, ParseError, { digits: string }>({
  digits: ({ digits }) => alt(digit, map(concat, digits, digit))
});

const integer = alt(
  digit,
  map(concat, onenine, digits),
  map(concat, text("-"), digit),
  map(concat, text("-"), onenine, digits)
);

const fraction: StringParser<string> = alt(
  pure(""),
  map(concat, text("."), digits)
);

const sign: StringParser<string> = alt(pure(""), oneOf("+-"));

const exponent: StringParser<string> = alt(
  pure(""),
  map(concat, oneOf("Ee"), sign, digits)
);

const number: StringParser<number> = map(
  Number.parseFloat,
  map(concat, integer, fraction, exponent)
);

const hex = oneOf("0123456789ABCDEFabcdef");

const escapeCharacter = alt(
  oneOf('"\\/bfnrt'),
  map(concat, text("u"), hex, hex, hex, hex)
);

const character: StringParser<string> = alt(
  read((received) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- never null
    const codePoint = received.codePointAt(0)!;
    return codePoint < 0x20 || '"\\'.includes(received)
      ? fail({ expected: "character", received })
      : pure(received);
  }),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- always string
  map((_, c): string => JSON.parse(`"\\${c}"`), text("\\"), escapeCharacter)
);

const { characters } = fix<string, ParseError, { characters: string }>({
  characters: ({ characters }) =>
    alt(pure(""), map(concat, characters, character))
});

const string: StringParser<string> = map(
  (_1, string, _2) => string,
  text('"'),
  characters,
  text('"')
);

type JSONValue = string | number | boolean | JSONValue[] | JSONObject | null;

interface JSONObject {
  [key: string]: JSONValue;
}

interface JSONLanguage {
  value: JSONValue;
  element: JSONValue;
  elements: JSONValue[];
  array: JSONValue[];
  member: JSONObject;
  members: JSONObject;
  object: JSONObject;
}

const { element } = fix<string, ParseError, JSONLanguage>({
  value: ({ object, array }) =>
    alt<string, ParseError, JSONValue>(
      object,
      array,
      string,
      number,
      map((_) => true, text("true")),
      map((_) => false, text("false")),
      map((_) => null, text("null"))
    ),
  element: ({ value }) =>
    map((_1, jsonValue, _2) => jsonValue, whitespace, value, whitespace),
  elements: ({ element, elements }) =>
    alt(
      map((jsonValue) => [jsonValue], element),
      map(
        (jsonArray, _comma, jsonValue) => [...jsonArray, jsonValue],
        elements,
        text(","),
        element
      )
    ),
  array: ({ elements }) =>
    alt(
      map((_1, _2, _3) => [], text("["), whitespace, text("]")),
      map((_1, jsonArray, _2) => jsonArray, text("["), elements, text("]"))
    ),
  member: ({ element }) =>
    map(
      (_1, key, _2, _3, jsonValue) => ({ [key]: jsonValue }),
      whitespace,
      string,
      whitespace,
      text(":"),
      element
    ),
  members: ({ member, members }) =>
    alt(
      member,
      map(
        (object1, _comma, object2) => ({ ...object1, ...object2 }),
        members,
        text(","),
        member
      )
    ),
  object: ({ members }) =>
    alt(
      map((_1, _2, _3) => ({}), text("{"), whitespace, text("}")),
      map((_1, jsonObect, _2) => jsonObect, text("{"), members, text("}"))
    )
});

const parseJSON = (input: string) => {
  let state = begin(element);

  for (const char of input) {
    const { result, continuations } = state;
    /* istanbul ignore if */
    if (continuations === null) return result;
    state = next(continuations, char);
  }

  return state.result;
};

export { parseJSON };
