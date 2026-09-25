const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { CreateDocument, SerializeChildren } = require("./fake-dom.js");

const root = path.join(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const overlayScript = fs.readFileSync(path.join(root, "script.js"), "utf8");
const renderingScript = fs.readFileSync(path.join(root, "twitch-message.js"), "utf8");

function LoadRendering() {
	const context = {};
	context.globalThis = context;
	vm.runInNewContext(renderingScript, context);
	return context.TwitchMessageRendering;
}

test("loads Twitch message rendering before the overlay", () => {
	const renderingIndex = indexHtml.indexOf('src="./twitch-message.js"');
	const overlayIndex = indexHtml.indexOf('src="./script.js"');

	assert.ok(renderingIndex >= 0);
	assert.ok(renderingIndex < overlayIndex);
	assert.match(overlayScript, /TwitchMessageRendering\.RenderParts\(/);
	assert.match(overlayScript, /const user = data\.anonymous \? null : data\.user;/);
});

test("renders every field in a Streamer.bot cheer message part", () => {
	const document = CreateDocument();
	const container = document.createElement("span");
	const rendering = LoadRendering();
	const imageUrl = "https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/100000/4.gif";

	const rendered = rendering.RenderParts(container, [{
		bits: 25,
		color: "#f3a71a",
		imageUrl,
		zeroWidth: false,
		type: "cheer",
		text: "Cheer25",
	}]);

	assert.equal(rendered, true);
	assert.equal(container.childNodes.length, 2);

	const [image, bits] = container.childNodes;
	assert.equal(image.tagName, "IMG");
	assert.equal(image.src, imageUrl);
	assert.equal(image.alt, "");
	assert.equal(image.classList.contains("emote"), true);
	assert.equal(image.classList.contains("zero-width-emote"), false);

	assert.equal(bits.tagName, "SPAN");
	assert.equal(bits.textContent, "25");
	assert.equal(bits.style.color, "#f3a71a");
	assert.equal(bits.attributes["aria-label"], "Cheer25");
	assert.equal(bits.classList.contains("bits"), true);
});

test("preserves part order and handles text, emotes, and zero-width overlays", () => {
	const document = CreateDocument();
	const container = document.createElement("span");
	const rendering = LoadRendering();

	rendering.RenderParts(container, [
		{ type: "text", text: "hello " },
		{ type: "emote", text: "Kappa", imageUrl: "https://example.com/kappa.png", zeroWidth: false },
		{ type: "emote", text: "Overlay", imageUrl: "https://example.com/overlay.png", zeroWidth: true },
		{ type: "mention", text: " @viewer" },
	], (text) => text.toUpperCase());

	assert.equal(container.childNodes[0].textContent, "HELLO ");
	assert.equal(container.childNodes[1].alt, "Kappa");
	assert.equal(container.childNodes[2].classList.contains("zero-width-emote"), true);
	assert.equal(container.childNodes[3].textContent, " @viewer");
});

test("falls back to the plain message when parts are unavailable", () => {
	const document = CreateDocument();
	const container = document.createElement("span");
	const rendering = LoadRendering();

	assert.equal(rendering.RenderParts(container, null), false);
	assert.equal(rendering.RenderParts(container, []), false);
	assert.deepEqual(container.childNodes, []);
});

test("fallback rendering supports both field casings and repeated tokens", () => {
	const document = CreateDocument();
	const container = document.createElement("span");
	const rendering = LoadRendering();
	container.textContent = "hello :)! Cheer25 cheer25";

	rendering.RenderFallback(
		container,
		[{ name: ":)", imageUrl: "https://example.com/smile.png" }],
		[{
			Bits: 25,
			Color: "#f3a71a",
			ImageUrl: "https://example.com/cheer.gif",
			Name: "Cheer",
		}],
		25,
	);

	assert.equal(
		SerializeChildren(container),
		'hello <img src="https://example.com/smile.png" class="emote">! '
			+ '<img src="https://example.com/cheer.gif" class="emote"><span class="bits" style="color: #f3a71a">25</span> '
			+ '<img src="https://example.com/cheer.gif" class="emote"><span class="bits" style="color: #f3a71a">25</span>',
	);
});

test("fallback rendering only matches emotes on word boundaries, including adjacent emotes", () => {
	const document = CreateDocument();
	const container = document.createElement("span");
	const rendering = LoadRendering();
	container.textContent = "Kappa KappaPride xKappa :):) a:)";

	rendering.RenderFallback(container, [
		{ name: "Kappa", imageUrl: "https://example.com/kappa.png" },
		{ name: ":)", imageUrl: "https://example.com/smile.png" },
	]);

	assert.equal(
		SerializeChildren(container),
		'<img src="https://example.com/kappa.png" class="emote"> KappaPride xKappa '
			+ '<img src="https://example.com/smile.png" class="emote"><img src="https://example.com/smile.png" class="emote"> a:)',
	);
});

test("fallback rendering keeps HTML in message text and emote fields inert", () => {
	const document = CreateDocument();
	const container = document.createElement("span");
	const rendering = LoadRendering();
	const payload = '<img src=x onerror="alert(1)">';
	const imageUrl = 'https://example.com/a.png" onerror="alert(2)';
	container.textContent = `${payload} Kappa &lt; Cheer5`;

	rendering.RenderFallback(
		container,
		[{ name: "Kappa", imageUrl }, { name: "lt", imageUrl }],
		[{ name: "Cheer", bits: 5, color: "red;background:url(x)", imageUrl }],
	);

	const [text, emote, amp, ltEmote, separator, cheer, bits] = container.childNodes;
	assert.equal(container.childNodes.length, 7);
	assert.equal(text.nodeValue, `${payload} `);
	assert.equal(emote.src, imageUrl);
	assert.equal(amp.nodeValue, " &");
	assert.equal(ltEmote.src, imageUrl);
	assert.equal(separator.nodeValue, "; ");
	assert.equal(cheer.src, imageUrl);
	assert.equal(bits.textContent, "5");
	assert.equal(bits.style.color, "red;background:url(x)");
});
