const pure = (value) => ({ case: "pure", value });

const bind = (parser, arrow) => ({ case: "bind", parser, arrow });

const map = (morphism, ...parsers) => {
  const iterate = (tail, index) => {
    let { length } = parsers;
    if (index < length)
      return bind(parsers[index], (head) => iterate({ head, tail }, index + 1));
    // eslint-disable-next-line unicorn/no-new-array -- performance optimization
    const results = new Array(length);
    for (let list = tail; list !== null; list = list.tail)
      results[(length -= 1)] = list.head;
    return pure(morphism(...results));
  };

  return iterate(null, 0);
};

const alt = (...parsers) => ({ case: "alt", parsers });

const fail = (error) => ({ case: "fail", error });

const read = (arrow) => ({ case: "read", arrow });

const fix = (combinators) => {
  const states = {};
  const parsers = {};
  for (const key of Object.keys(combinators)) {
    states[key] = null;
    parsers[key] = { case: "fix", key, combinators, states, parsers };
  }
  return parsers;
};

const apply = (application) => {
  let { closure, inputs } = application;

  while (closure.case !== "identity") {
    switch (closure.case) {
      case "pure": {
        const { value } = closure;
        const { continuation, state, morphism } = inputs;
        closure = continuation;
        inputs = { value, state, morphism };
        continue;
      }
      case "bind": {
        const { parser, arrow } = closure;
        const { continuation, state, morphism } = inputs;
        closure = parser;
        inputs = {
          continuation: { case: "compose", arrow, continuation },
          state,
          morphism
        };
        continue;
      }
      case "compose": {
        const { arrow, continuation } = closure;
        const { value, state, morphism } = inputs;
        closure = arrow(value);
        inputs = { continuation, state, morphism };
        continue;
      }
      case "alt": {
        const { parsers } = closure;
        const { continuation, state, morphism } = inputs;
        closure = morphism;
        for (const parser of parsers)
          closure = { case: "run", parser, continuation, morphism: closure };
        inputs = { state };
        continue;
      }
      case "run": {
        const { parser, continuation, morphism } = closure;
        const { state } = inputs;
        closure = parser;
        inputs = { continuation, state, morphism };
        continue;
      }
      case "fail": {
        const { error } = closure;
        const {
          state: { result, continuations },
          morphism
        } = inputs;
        closure = morphism;
        inputs = {
          state: {
            result: result.success
              ? result
              : {
                  success: false,
                  errors: { head: error, tail: result.errors }
                },
            continuations
          }
        };
        continue;
      }
      case "read": {
        const { arrow } = closure;
        const {
          continuation,
          state: { result, continuations },
          morphism
        } = inputs;
        closure = morphism;
        inputs = {
          state: {
            result,
            continuations: {
              head: { case: "compose", arrow, continuation },
              tail: continuations
            }
          }
        };
        continue;
      }
      case "fix": {
        const { key, combinators, states: fixStates } = closure;
        const { continuation, state, morphism } = inputs;
        if (fixStates[key] === null) {
          const states = {};
          const parsers = {};
          for (const name of Object.keys(fixStates)) {
            states[name] = fixStates[name];
            parsers[name] = {
              case: "fix",
              key: name,
              combinators,
              states,
              parsers
            };
          }
          states[key] = { continuations: null };
          closure = parsers[key];
        }
        const { states, parsers } = closure;
        const fixState = states[key];
        const { continuations } = fixState;
        fixState.continuations = { head: continuation, tail: continuations };
        if (continuations !== null) {
          closure = morphism;
          inputs = { state };
          continue;
        }
        const rec = { case: "rec", done: false, value: null };
        closure = combinators[key](parsers);
        inputs = {
          continuation: rec,
          state,
          morphism: { case: "tie", key, states, rec, morphism }
        };
        continue;
      }
      case "rec": {
        if (closure.done) {
          closure = closure.value;
          continue;
        }
        const { value, state, morphism } = inputs;
        closure.value = { head: value, tail: closure.value };
        closure = morphism;
        inputs = { state };
        continue;
      }
      case "tie": {
        const { key, states, rec, morphism } = closure;
        const fixState = states[key];
        let values = rec.value;
        const continuation = {
          case: "concat",
          continuations: fixState.continuations
        };
        rec.done = true;
        rec.value = continuation;
        fixState.continuations = null;
        closure = morphism;
        while (values !== null) {
          closure = {
            case: "resume",
            continuation,
            value: values.head,
            morphism: closure
          };
          values = values.tail;
        }
        continue;
      }
      case "concat": {
        let { continuations } = closure;
        const { value, state, morphism } = inputs;
        closure = morphism;
        while (continuations !== null) {
          closure = {
            case: "resume",
            continuation: continuations.head,
            value,
            morphism: closure
          };
          continuations = continuations.tail;
        }
        inputs = { state };
        continue;
      }
      case "resume": {
        const { continuation, value, morphism } = closure;
        const { state } = inputs;
        closure = continuation;
        inputs = { value, state, morphism };
        continue;
      }
      case "cons": {
        const {
          value,
          state: { result, continuations },
          morphism
        } = inputs;
        closure = morphism;
        inputs = {
          state: {
            result: {
              success: true,
              values: {
                head: value,
                tail: result.success ? result.values : null
              }
            },
            continuations
          }
        };
        continue;
      }
      // no default
    }
  }

  return inputs.state;
};

const cons = { case: "cons" };

const empty = { result: { success: false, errors: null }, continuations: null };

const identity = { case: "identity" };

const begin = (parser) =>
  apply({
    closure: parser,
    inputs: { continuation: cons, state: empty, morphism: identity }
  });

const next = (continuations, value) =>
  apply({
    closure: { case: "concat", continuations },
    inputs: { value, state: empty, morphism: identity }
  });

export { pure, bind, map, alt, fail, read, fix, begin, next };
