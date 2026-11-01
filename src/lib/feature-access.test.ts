import { describe, it } from "node:test";
import { notEqual } from "node:assert/strict";
import { featureAccessError } from "./feature-access";

describe("tool access errors", () => {
  it("expired authentication is not reported as a payment failure", () => {
    notEqual(featureAccessError("not_authenticated"), featureAccessError("error"));
  });
});