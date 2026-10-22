import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { isRecoveryProofValid, passwordResetRedirect, RECOVERY_WINDOW_MS } from "./passwordRecovery";

const expect = (actual: unknown) => ({ toBe: (expected: unknown) => assert.equal(actual, expected) });

describe("website password recovery", () => {
  test("published email returns to the reset page", () => {
    expect(passwordResetRedirect("https://nestling-app.lovable.app")).toBe("https://nestling-app.lovable.app/reset-password");
  });
  test("Worker copies send resets to the published website", () => {
    expect(passwordResetRedirect("https://nestling.example.workers.dev")).toBe("https://nestling-app.lovable.app/reset-password");
  });
  test("normal sessions without recovery proof cannot reset", () => {
    expect(isRecoveryProofValid(null, "user-a", "session-a", 1000)).toBe(false);
  });
  test("verified recovery survives reload for the same user and session", () => {
    expect(isRecoveryProofValid({ userId: "user-a", sessionId: "session-a", expiresAt: 2000 }, "user-a", "session-a", 1000)).toBe(true);
  });
  test("expired proof cannot enable password updates", () => {
    expect(isRecoveryProofValid({ userId: "user-a", sessionId: "session-a", expiresAt: 1000 }, "user-a", "session-a", 1000)).toBe(false);
  });
  test("proof cannot carry over to another sign-in session", () => {
    expect(isRecoveryProofValid({ userId: "user-a", sessionId: "session-a", expiresAt: 2000 }, "user-a", "session-b", 1000)).toBe(false);
  });
  test("proof cannot carry over to another account", () => {
    expect(isRecoveryProofValid({ userId: "user-a", sessionId: "session-a", expiresAt: 2000 }, "user-b", "session-a", 1000)).toBe(false);
  });
  test("proof is limited to one hour", () => {
    expect(isRecoveryProofValid({ userId: "user-a", sessionId: "session-a", expiresAt: 1000 + RECOVERY_WINDOW_MS + 1 }, "user-a", "session-a", 1000)).toBe(false);
  });
});