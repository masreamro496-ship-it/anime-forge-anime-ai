import { describe, expect, test } from "bun:test";
import { featureAccessError } from "./feature-access";

describe("tool access errors", () => {
  test("expired authentication is not reported as a payment failure", () => {
    expect(featureAccessError("not_authenticated")).not.toBe(featureAccessError("error"));
  });
});