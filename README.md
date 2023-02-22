# Syntactics

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/aaditmshah/syntactics/continuous-deployment.yml?branch=main&logo=github)](https://github.com/aaditmshah/syntactics/actions/workflows/continuous-deployment.yml)
[![GitHub license](https://img.shields.io/github/license/aaditmshah/syntactics)](https://github.com/aaditmshah/syntactics/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/syntactics?logo=npm)](https://www.npmjs.com/package/syntactics)
[![semantic-release: gitmoji](https://img.shields.io/badge/semantic--release-gitmoji-E10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![Twitter](https://img.shields.io/twitter/url?url=https%3A%2F%2Fgithub.com%2Faaditmshah%2Fsyntactics)](https://twitter.com/intent/tweet?text=Wow:&url=https%3A%2F%2Fgithub.com%2Faaditmshah%2Fsyntactics)

Syntactics is a monadic bottom-up parser combinator library.

## Contents

- [Features](#features)
- [Planned Features](#planned-features)
- [Examples](#examples)
- [API Reference](#api-reference)

## Features

- Supports both [applicative](https://en.wikipedia.org/wiki/Applicative_functor) and [monadic](<https://en.wikipedia.org/wiki/Monad_(functional_programming)>) application programming interfaces.
- Implements an [efficient strategy](https://okmij.org/ftp/papers/LogicT.pdf) for [parallel parsing](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/0AF17481A41F2007752F530F07698139/S0956796804005192a.pdf/functional-pearl-parallel-parsing-processes.pdf) without backtracking.
- Permits [left recursion](https://en.wikipedia.org/wiki/Left_recursion), allowing straightforward implementation of parsers.
- Facilitates modular and piecewise construction of [recursive ascent parsers](https://en.wikipedia.org/wiki/Recursive_ascent_parser).
- Enables parsing non-deterministic and ambiguous [context-free languages](https://en.wikipedia.org/wiki/Context-free_language).
- Allows parsing all context-free languages using the applicative interface.
- Allows parsing [context-sensitive languages](https://en.wikipedia.org/wiki/Context-sensitive_language) using the monadic interface.
- Provides stack-safe composition and recursion using hand-optimized code.
- Produces partial parser results and supports parsing streams [incrementally](https://en.wikipedia.org/wiki/Online_algorithm).
- Takes the types of the token, the error, and the output values as [parameters](https://en.wikipedia.org/wiki/Parametric_polymorphism).

## Planned Features

- Exports algorithms for parsing JavaScript strings and UTF-8 byte sequences.
- Exposes a rich set of parser combinators for quickly prototyping languages.
- Allows specifying error recovery strategies to create error-tolerant parsers.

## Examples

- [JSON parser](https://github.com/aaditmshah/syntactics/blog/master/src/json.ts)

## API Reference

<details>
<summary><strong>Type <code>Parser&lt;T, E, A&gt;</code></strong></summary>

<br/>Represents a parser which consumes tokens of type `T` and returns either errors of type `E` or values of type `A`.

</details>

<details>
<summary><strong>Function <code>pure</code></strong></summary>

<br/>Returns a parser which always succeeds. The parser returns the given value. It doesn't consume any input tokens.

**Type Declaration**

```typescript
const pure: <T, E, A>(value: A) => Parser<T, E, A>;
```

**Use Cases**

The `pure` function is commonly used to create optional parsers. For example, if we have a parser for a plus or a minus sign called `sign`, then we can make it optional as follows.

```typescript
const optionalSign = alt(pure(""), sign);
```

The `pure` function is also commonly used with the `read` function to accept specific tokens. For example, here's a parser which accepts digits and rejects everything else.

```typescript
const digit = read((character) =>
  "0123456789".includes(character)
    ? pure(character)
    : fail({ expected: "digit", received: character })
);
```

</details>

<details>
<summary><strong>Function <code>bind</code></strong></summary>

<br/>Sequences two parsers. The second parser can depend upon the output of the first parser. Hence, it's more powerful than the `map` function. However, it's also more difficult to use. Always prefer using the `map` function instead of the `bind` function for parsing context-free languages.

**Type Declaration**

```typescript
const bind: <T, E, A, B>(
  parser: Parser<T, E, A>,
  arrow: (value: A) => Parser<T, E, B>
) => Parser<T, E, B>;
```

**Use Cases**

Used for context-sensitive parsing. For example, given a function `repeat` than can repeat a parser a specified number of times, we can create a parser for the context-sensitive language $a^nb^nc^n$ using `bind`.

```typescript
const abcCount = (n: number) =>
  alt(
    bind(a, () => abcCount(n + 1)),
    map(() => n, repeat(b, n), repeat(c, n))
  );

const abc = abcCount(0);
```

</details>

<details>
<summary><strong>Function <code>map</code></strong></summary>

<br/>Sequences and transforms the results of multiple parsers. The input parsers are independent of each other. Hence, it's less powerful than `bind`. However, it's much easier to use. Always prefer using the `map` function instead of the `bind` function for parsing context-free languages.

**Type Declaration**

```typescript
type Parsers<T, E, A> = {
  [K in keyof A]: Parser<T, E, A[K]>;
};

const map: <T, E, A extends unknown[], B>(
  morphism: (...a: A) => B,
  ...parsers: Parsers<T, E, A>
) => Parser<T, E, B>;
```

**Use Cases**

Used for sequencing parsers. For example, given parsers for parsing identifiers, arbitrary text, and expressions, we can create a parser for declarations.

```typescript
const makeDeclaration = (name, _equals, expr) => ({
  type: "declaration",
  name,
  expr
});

const declaration = map(makeDeclaration, identifier, text("="), expression);
```

</details>

<details>
<summary><strong>Function <code>alt</code></strong></summary>

<br/>Combines multiple parsers non-deterministically. The resultant parser executes the input parsers in parallel and without backtracking. The order of the input parsers doesn't matter. It can also return multiple results for ambiguous grammars.

**Type Declaration**

```typescript
const alt: <T, E, A>(...parsers: Parser<T, E, A>[]) => Parser<T, E, A>;
```

**Use Cases**

Used for selecting parsers non-deterministically. For example, given parsers for expressions and declarations, we can create a parser that can parse either expressions or declarations.

```typescript
const eitherExpressionOrDeclaration = alt(expression, declaration);
```

</details>

<details>
<summary><strong>Function <code>fail</code></strong></summary>

<br/>Returns a parser which always fails. The parser returns the given error. It doesn't consume any input tokens.

**Type Declaration**

```typescript
const fail: <T, E, A>(error: E) => Parser<T, E, A>;
```

**Use Cases**

The `fail` function is also commonly used with the `read` function to reject specific tokens. For example, here's a parser which accepts digits and rejects everything else.

```typescript
const digit = read((character) =>
  "0123456789".includes(character)
    ? pure(character)
    : fail({ expected: "digit", received: character })
);
```

</details>

<details>
<summary><strong>Function <code>read</code></strong></summary>

<br/>Returns a parser which consumes a single input token and applies the input function to this token. The input function can decide whether to accept the token, reject the token, or continue parsing more input tokens.

**Type Declaration**

```typescript
const read: <T, E, A>(arrow: (token: T) => Parser<T, E, A>) => Parser<T, E, A>;
```

**Use Cases**

Reading and parsing tokens from the input stream. For example, here's a parser for the keyword `if`.

```typescript
const keywordIf = read((char1) => {
  if (char1 !== "i") return fail({ expected: "i", received: char1 });
  return read((char2) => {
    if (char2 !== "f") return fail({ expected: "f", received: char2 });
    return pure("if");
  });
});
```

</details>

<details>
<summary><strong>Function <code>fix</code></strong></summary>

<br/>Returns an object of mutually-recursive parsers. The input of the `fix` function is an object of combinators. The `fix` function feeds the output of all the combinators, which is collected as an object of mutually-recursive parsers, to each of the combinators. Kind of like a dragon eating its own tail.

<img src="./media/ouroboros.png" alt="Ouroboros Dragon" width="200" height="210" />

Self reference, symbolized as the Ouroboros Dragon, allows us to define recursive and mutually-recursive parsers. The `fix` function also allows you to define [left-recursive](https://en.wikipedia.org/wiki/Left_recursion) parsers.

**Type Declaration**

```typescript
type Parsers<T, E, A> = {
  [K in keyof A]: Parser<T, E, A[K]>;
};

type Combinators<T, E, A> = {
  [K in keyof A]: (parsers: Parsers<T, E, A>) => Parser<T, E, A[K]>;
};

const fix: <T, E, A extends {}>(
  combinators: Combinators<T, E, A>
) => Parsers<T, E, A>;
```

**Use Cases**

Defining recursive and mutually-recursive parsers. For example, given parsers for numbers and arbitrary text we can define parsers for expressions, terms, and factors.

```typescript
const makeAdd = (left, _plus, right) => ({ type: "add", left, right });

const makeMul = (left, _times, right) => ({ type: "mul", left, right });

const makeGroup = (_left, expr, _right) => expr;

const { expression } = fix({
  expression: ({ expression, term }) =>
    alt(term, map(makeAdd, expression, text("+"), term)),
  term: ({ term, factor }) =>
    alt(factor, map(makeMul, term, text("*"), factor)),
  factor: ({ expression }) =>
    alt(number, map(makeGroup, text("("), expression, text(")")))
});
```

</details>

<details>
<summary><strong>Type <code>ParserResult&lt;E, R&gt;</code></strong></summary>

<br/>Represents the result of a parser. It can either contain zero or more errors of type `T`, or one or more parsed values of type `R`.

**Type Declaration**

```typescript
interface Cons<A> {
  head: A;
  tail: List<A>;
}

type List<A> = Cons<A> | null;

type ParserResult<E, R> =
  | { success: false; errors: List<E> }
  | { success: true; values: Cons<R> };
```

</details>

<details>
<summary><strong>Type <code>Continuation&lt;T, E, R, A&gt;</code></strong></summary>

<br/>Represents a possible continuation of the parsing process at a given point. A non-empty list of continuations can be given to the `next` function to continue the parsing process from that point.

</details>

<details>
<summary><strong>Interface <code>ParseState&lt;T, E, R&gt;</code></strong></summary>

<br/>Represents the state of the parsing process at a given point. It contains the result of the parsing process at that point. It also contains the list of continuations of the parsing process from that point.

**Type Declaration**

```typescript
interface Cons<A> {
  head: A;
  tail: List<A>;
}

type List<A> = Cons<A> | null;

interface ParseState<T, E, R> {
  result: ParserResult<E, R>;
  continuations: List<Continuation<T, E, R, T>>;
}
```

</details>

<details>
<summary><strong>Function <code>begin</code></strong></summary>

<br/>Starts the parsing process and returns the first parse state.

**Type Declaration**

```typescript
const begin: <T, E, R>(parser: Parser<T, E, R>) => ParseState<T, E, R>;
```

**Use Cases**

The `begin` function is used to start the parsing process.

```typescript
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
```

</details>

<details>
<summary><strong>Function <code>next</code></strong></summary>

<br/>Continues the parsing process and returns the next parse state. The list of non-empty continuations specify where to continue the parsing process from. In order to continue the parsing process, the next token from the input stream needs to be given to the `next` function.

**Type Declaration**

```typescript
const next: <T, E, R>(
  continuations: Cons<Continuation<T, E, R, T>>,
  token: T
) => ParseState<T, E, R>;
```

**Use Cases**

The `next` function is used to continue the parsing process.

```typescript
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
```

</details>
