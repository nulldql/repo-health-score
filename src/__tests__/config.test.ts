import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, parseRepoSlug } from "../config.js";

test("parseRepoSlug accepts a plain owner/repo string", () => {
  assert.deepEqual(parseRepoSlug("facebook/react"), { owner: "facebook", repo: "react" });
});

test("parseRepoSlug accepts a full github.com URL", () => {
  assert.deepEqual(parseRepoSlug("https://github.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
});

test("parseRepoSlug strips a trailing .git and slash", () => {
  assert.deepEqual(parseRepoSlug("https://github.com/facebook/react.git/"), {
    owner: "facebook",
    repo: "react",
  });
});

test("parseRepoSlug rejects something that isn't owner/repo shaped", () => {
  assert.throws(() => parseRepoSlug("just-a-name"));
  assert.throws(() => parseRepoSlug("too/many/slashes"));
});

test("parseArgs returns defaults for a bare repo slug", async (t) => {
  t.mock.method(console, "log", () => {});
  const config = await parseArgs(["facebook/react"]);
  assert.ok(config);
  assert.equal(config.repo, "facebook/react");
  assert.equal(config.json, false);
  assert.equal(config.color, true);
  assert.deepEqual(config.categories, []);
});

test("parseArgs sets json and no-color flags", async () => {
  const config = await parseArgs(["facebook/react", "--json", "--no-color"]);
  assert.equal(config?.json, true);
  assert.equal(config?.color, false);
});

test("parseArgs collects a token and repeated categories", async () => {
  const config = await parseArgs([
    "facebook/react",
    "--token",
    "abc123",
    "--category",
    "Tests",
    "--category",
    "CI",
  ]);
  assert.equal(config?.token, "abc123");
  assert.deepEqual(config?.categories, ["Tests", "CI"]);
});

test("parseArgs rejects more than one repo argument", async () => {
  await assert.rejects(() => parseArgs(["facebook/react", "vercel/next.js"]));
});

test("parseArgs rejects an unknown flag", async () => {
  await assert.rejects(() => parseArgs(["facebook/react", "--nope"]));
});

test("parseArgs returns null and prints help with no repo given", async (t) => {
  const calls: string[] = [];
  t.mock.method(console, "log", (msg: string) => calls.push(msg));
  const config = await parseArgs([]);
  assert.equal(config, null);
  assert.ok(calls.some((c) => c.includes("repo-health")));
});
