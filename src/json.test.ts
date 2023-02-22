import { parseJSON } from "./json";

const sample = {
  leaving: {
    tail: [-2_063_823_378.859_781_3, true, false, null, -153_646.6402, "board"],
    fed: -283_765_067.914_962_3,
    cowboy: -355_139_449,
    although: 794_127_593.392_259_1,
    front: "college",
    origin: 981_339_097
  },
  though: true,
  invalid: "\uDFFF",
  activity: "value",
  office: -342_325_541.193_750_6,
  noise: false,
  acres: "home",
  foo: [],
  bar: {}
};

describe("json parser", () => {
  it("should correctly parse json strings", () => {
    expect.assertions(1);
    const result = parseJSON(JSON.stringify(sample, null, 4));
    expect(result).toStrictEqual({
      success: true,
      values: { head: sample, tail: null }
    });
  });
});
