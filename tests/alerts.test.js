"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { CreateDocument, SerializeChildren } = require("./fake-dom.js");

const root = path.join(__dirname, "..");
const overlayScript = fs.readFileSync(path.join(root, "script.js"), "utf8");
const renderingScript = fs.readFileSync(path.join(root, "twitch-message.js"), "utf8");

const payload = '<img src=x onerror="alert(1)">';
const escapedPayload = '&lt;img src=x onerror="alert(1)"&gt;';

function LoadOverlay() {
	const document = CreateDocument();
	const alertBox = document.createElement("div");
	const alertBoxContent = document.createElement("div");
	const elements = {
		"#alertBox": alertBox,
		"#alertBoxContent": alertBoxContent,
		"#background": document.createElement("div"),
		"#messageList": document.createElement("ul"),
	};

	document.body = { style: {} };
	document.documentElement = { style: { setProperty() {} } };
	document.querySelector = (selector) => elements[selector];

	const context = {
		console: { debug() {}, log() {}, error() {} },
		document,
		setTimeout: (callback) => callback(),
		StreamerbotClient: class {
			on() {}
		},
		URLSearchParams,
		window: { location: { search: "" } },
	};
	context.globalThis = context;
	vm.createContext(context);
	vm.runInContext(renderingScript, context);
	vm.runInContext(overlayScript, context);

	return { context, alertBoxContent };
}

test("overlay scripts never render through innerHTML", () => {
	assert.doesNotMatch(overlayScript, /innerHTML/);
	assert.doesNotMatch(renderingScript, /innerHTML/);
});

const donationAlerts = [
	["StreamlabsDonation", { from: payload, formattedAmount: "5.00", currency: "$" }, `🪙 ${escapedPayload} donated $5.00`],
	["StreamElementsTip", { username: payload, amount: 5, currency: "" }, `🪙 ${escapedPayload} donated $5`],
	["TipeeeStreamDonation", { username: payload, amount: 5, currency: "USD" }, `<img src="icons/platforms/tipeeeStream.png" class="platform"> ${escapedPayload} donated $5`],
	["KofiDonation", { from: payload, amount: 5, currency: "USD" }, `<img src="icons/platforms/kofi.png" class="platform"> ${escapedPayload} donated $5`],
	["KofiShopOrder", { from: payload, amount: 0, currency: "USD", items: [{}] }, `<img src="icons/platforms/kofi.png" class="platform"> ${escapedPayload} ordered 1 item(s) on Ko-fi `],
	["PatreonPledgeCreated", { attributes: { full_name: payload, will_pay_amount_cents: 500 } }, `<img src="icons/platforms/patreon.png" class="platform"> ${escapedPayload} joined Patreon ($5.00)`],
	["FourthwallDonation", { username: payload, amount: 5, currency: "USD" }, `${escapedPayload} donated $5`],
	["YouTubeSuperChat", { user: { name: payload }, amount: "$5.00" }, `🪙 ${escapedPayload} sent a Super Chat ($5.00)`],
];

for (const [handler, data, expected] of donationAlerts) {
	test(`${handler} renders supporter-controlled names as text`, () => {
		const { context, alertBoxContent } = LoadOverlay();

		context[handler](data);

		assert.equal(SerializeChildren(alertBoxContent), expected);
	});
}

test("channel point redemptions render the reward title as text beside the icon", () => {
	const { context, alertBoxContent } = LoadOverlay();

	context.TwitchRewardRedemption({ user_name: "viewer", reward: { title: payload, cost: 100 } });

	assert.equal(
		SerializeChildren(alertBoxContent),
		`viewer redeemed ${escapedPayload} <img src="icons/badges/twitch-channel-point.png" class="platform"> 100`,
	);
});

test("announcements render message parts as text and emotes", () => {
	const { context, alertBoxContent } = LoadOverlay();

	context.TwitchAnnouncement({
		announcementColor: "BLUE",
		text: `${payload} Kappa`,
		parts: [
			{ type: "text", text: `${payload} ` },
			{ type: "emote", text: "Kappa", imageUrl: "https://example.com/kappa.png" },
		],
	});

	assert.equal(
		SerializeChildren(alertBoxContent),
		`<span>${escapedPayload} <img src="https://example.com/kappa.png" class="emote"></span>`,
	);
});

test("announcements without message parts render the raw text", () => {
	const { context, alertBoxContent } = LoadOverlay();

	context.TwitchAnnouncement({ announcementColor: "GREEN", text: payload });

	assert.equal(SerializeChildren(alertBoxContent), `<span>${escapedPayload}</span>`);
});
