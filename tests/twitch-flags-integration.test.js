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

test("exposes a default-on Show Flags Appearance setting", () => {
	const settings = JSON.parse(
		fs.readFileSync(path.join(root, "settings", "settings.json"), "utf8"),
	);
	const showFlags = settings.settings.find((setting) => setting.id === "showFlags");

	assert.deepEqual(showFlags, {
		id: "showFlags",
		label: "Show Flags",
		description: "",
		type: "checkbox",
		defaultValue: true,
		group: "Appearance",
	});
});

test("loads the flag scripts and places the flag after the username", () => {
	const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
	const libraryIndex = html.indexOf(
		'src="https://desertice.github.io/TwitchFlagsJS/twitchflags.js"',
	);
	const adapterIndex = html.indexOf('src="./twitch-flags-integration.js"');
	const appIndex = html.indexOf('src="./script.js"');
	const usernameIndex = html.indexOf('<span id="username"></span>');
	const flagIndex = html.indexOf('<span id="flag"></span>');
	const separatorIndex = html.indexOf('<span id="colon-separator">');

	assert.ok(libraryIndex >= 0 && libraryIndex < adapterIndex && adapterIndex < appIndex);
	assert.ok(usernameIndex >= 0 && usernameIndex < flagIndex && flagIndex < separatorIndex);
});

test("wires the flag option and numeric Twitch user ID into chat rendering", () => {
	const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
	const stylesheet = fs.readFileSync(path.join(root, "style.css"), "utf8");

	assert.match(script, /const showFlags = GetBooleanParam\("showFlags", true\);/);
	assert.match(script, /const flagDiv = instance\.querySelector\("#flag"\);/);
	assert.match(
		script,
		/await HorizontalChatFlags\.RenderFlag\(flagDiv, data\.user\.id, showFlags\);/,
	);
	assert.match(stylesheet, /\.user-flag\s*\{/);
});
