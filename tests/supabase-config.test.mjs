import test from "node:test";
import assert from "node:assert/strict";
import { requireSupabaseConfig } from "../lib/supabase-config.js";

test("deployment config requires both public variables without revealing supplied values", () => {
  for (const env of [
    {},
    { VITE_SUPABASE_URL: " ", VITE_SUPABASE_ANON_KEY: " " },
    { VITE_SUPABASE_URL: "https://project.example" },
    { VITE_SUPABASE_ANON_KEY: "public-test-value" },
  ]) {
    assert.throws(
      () => requireSupabaseConfig(env),
      (error) => {
        assert.match(error.message, /Configuração do Supabase incompleta/);
        assert.match(error.message, /VITE_SUPABASE_/);
        assert.ok(!error.message.includes("project.example"));
        assert.ok(!error.message.includes("public-test-value"));
        return true;
      },
    );
  }
});

test("deployment config accepts custom hosts and rejects invalid URLs without echoing them", () => {
  assert.deepEqual(
    requireSupabaseConfig({
      VITE_SUPABASE_URL: " https://database.company.example ",
      VITE_SUPABASE_ANON_KEY: " public-test-value ",
    }),
    { url: "https://database.company.example", anonKey: "public-test-value" },
  );
  for (const url of ["invalid-sensitive-value", "file:///private/example"]) {
    assert.throws(
      () =>
        requireSupabaseConfig({
          VITE_SUPABASE_URL: url,
          VITE_SUPABASE_ANON_KEY: "public-test-value",
        }),
      (error) => {
        assert.match(error.message, /URL HTTP ou HTTPS válida/);
        assert.ok(!error.message.includes(url));
        assert.ok(!error.message.includes("public-test-value"));
        return true;
      },
    );
  }
});
