const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const overlayScript = fs.readFileSync(path.join(root, "script.js"), "utf8");
const renderingScript = fs.readFileSync(path.join(root, "twitch-message.js"), "utf8");

function CreateDocument() {
	const document = {
		createElement(tagName) {
			return CreateNode(document, tagName);
		},
		createTextNode(text) {
			return { nodeType: 3, textContent: text };
		},
	};

	return document;
}

function CreateNode(document, tagName) {
	const classes = [];
	return {
		tagName: tagName.toUpperCase(),
		ownerDocument: document,
		children: [],
		classList: {
			add(className) {
				classes.push(className);
			},
			contains(className) {
				return classes.includes(className);
			},
		},
		style: {},
		attributes: {},
		appendChild(child) {
			this.children.push(child);
		},
		replaceChildren(...children) {
			this.children = children;
		},
		setAttribute(name, value) {
			this.attributes[name] = value;
		},
	};
}

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
	const container = CreateNode(document, "span");
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
	assert.equal(container.children.length, 2);

	const [image, bits] = container.children;
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
	const container = CreateNode(document, "span");
	const rendering = LoadRendering();

	rendering.RenderParts(container, [
		{ type: "text", text: "hello " },
		{ type: "emote", text: "Kappa", imageUrl: "https://example.com/kappa.png", zeroWidth: false },
		{ type: "emote", text: "Overlay", imageUrl: "https://example.com/overlay.png", zeroWidth: true },
		{ type: "mention", text: " @viewer" },
	], (text) => text.toUpperCase());

	assert.equal(container.children[0].textContent, "HELLO ");
	assert.equal(container.children[1].alt, "Kappa");
	assert.equal(container.children[2].classList.contains("zero-width-emote"), true);
	assert.equal(container.children[3].textContent, " @viewer");
});

test("falls back to the plain message when parts are unavailable", () => {
	const document = CreateDocument();
	const container = CreateNode(document, "span");
	const rendering = LoadRendering();

	assert.equal(rendering.RenderParts(container, null), false);
	assert.equal(rendering.RenderParts(container, []), false);
	assert.deepEqual(container.children, []);
});

test("fallback rendering supports both field casings and repeated tokens", () => {
	const document = CreateDocument();
	const container = CreateNode(document, "span");
	const rendering = LoadRendering();
	container.innerHTML = "hello :)! Cheer25 cheer25";

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
		container.innerHTML,
		'hello <img src="https://example.com/smile.png" class="emote"/>! '
			+ '<img src="https://example.com/cheer.gif" class="emote"/><span class="bits" style="color: #f3a71a">25</span> '
			+ '<img src="https://example.com/cheer.gif" class="emote"/><span class="bits" style="color: #f3a71a">25</span>',
	);
});
