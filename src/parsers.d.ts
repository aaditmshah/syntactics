// eslint-disable-next-line max-classes-per-file -- abstract data types
declare interface Cons<out A> {
  head: A;
  tail: List<A>;
}

declare type List<A> = Cons<A> | null;

declare type ParserResult<E, R> =
  | { success: false; errors: List<E> }
  | { success: true; values: Cons<R> };

declare type Codensity<out A> = <R>(morphism: (a: A) => R) => R;

declare abstract class Continuation<in out T, in out E, in out R, in A> {
  private readonly continuation: (
    value: A,
    state: ParseState<T, E, R>
  ) => Codensity<ParseState<T, E, R>>;
}

declare interface ParseState<in out T, in out E, in out R> {
  result: ParserResult<E, R>;
  continuations: List<Continuation<T, E, R, T>>;
}

declare abstract class Parser<in out T, in out E, out A> {
  private readonly parser: <R>(
    continuation: Continuation<T, E, R, A>,
    state: ParseState<T, E, R>
  ) => Codensity<ParseState<T, E, R>>;
}

declare type Parsers<in out T, in out E, out A> = {
  [K in keyof A]: Parser<T, E, A[K]>;
};

declare type Combinators<in out T, in out E, in out A> = {
  [K in keyof A]: (parsers: Parsers<T, E, A>) => Parser<T, E, A[K]>;
};

declare const pure: <T, E, A>(value: A) => Parser<T, E, A>;

declare const bind: <T, E, A, B>(
  parser: Parser<T, E, A>,
  arrow: (value: A) => Parser<T, E, B>
) => Parser<T, E, B>;

declare const map: <T, E, A extends unknown[], B>(
  morphism: (...a: A) => B,
  ...parsers: Parsers<T, E, A>
) => Parser<T, E, B>;

declare const alt: <T, E, A>(...parsers: Parser<T, E, A>[]) => Parser<T, E, A>;

declare const fail: <T, E, A>(error: E) => Parser<T, E, A>;

declare const read: <T, E, A>(
  arrow: (token: T) => Parser<T, E, A>
) => Parser<T, E, A>;

declare const fix: <T, E, A extends {}>(
  combinators: Combinators<T, E, A>
) => Parsers<T, E, A>;

declare const begin: <T, E, R>(parser: Parser<T, E, R>) => ParseState<T, E, R>;

declare const next: <T, E, R>(
  continuations: Cons<Continuation<T, E, R, T>>,
  token: T
) => ParseState<T, E, R>;

export type {
  ParserResult,
  Continuation,
  ParseState,
  Parser,
  Parsers,
  Combinators
};
export { pure, bind, map, alt, fail, read, fix, begin, next };
