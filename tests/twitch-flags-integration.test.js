"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function loadAdapter(twitchFlagsJS) {
	const context = vm.createContext({ TwitchFlagsJS: twitchFlagsJS });
	context.globalThis = context;
	const source = fs.readFileSync(path.join(root, "twitch-flags-integration.js"), "utf8");
	vm.runInContext(source, context);
	return context.HorizontalChatFlags;
}

test("renders a returned flag for an enabled Twitch user", async () => {
	const classes = new Set();
	const image = { classList: { add: (className) => classes.add(className) } };
	const children = [];
	const container = { appendChild: (child) => children.push(child) };
	const lookedUpUserIds = [];
	const adapter = loadAdapter({
		GetFlagImageElement: async (userId) => {
			lookedUpUserIds.push(userId);
			return image;
		},
	});

	await adapter.RenderFlag(container, "18063875", true);

	assert.deepEqual(lookedUpUserIds, ["18063875"]);
	assert.equal(classes.has("user-flag"), true);
	assert.deepEqual(children, [image]);
});

test("does not look up or render a flag when disabled", async () => {
	let lookupCount = 0;
	const children = [];
	const adapter = loadAdapter({
		GetFlagImageElement: async () => {
			lookupCount += 1;
			return {};
		},
	});

	await adapter.RenderFlag({ appendChild: (child) => children.push(child) }, "18063875", false);

	assert.equal(lookupCount, 0);
	assert.deepEqual(children, []);
});

test("leaves the container empty when the user has no flag", async () => {
	const children = [];
	const adapter = loadAdapter({ GetFlagImageElement: async () => null });

	await adapter.RenderFlag({ appendChild: (child) => children.push(child) }, "18063875", true);

	assert.deepEqual(children, []);
});
