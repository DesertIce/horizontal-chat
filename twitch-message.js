(function installTwitchMessageRendering(global) {
	"use strict";

	const TEXT_NODE = 3;

	function GetPartValue(part, camelCaseName, pascalCaseName) {
		return part?.[camelCaseName] ?? part?.[pascalCaseName];
	}

	function EscapeRegExp(value) {
		return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	function AppendText(container, text, transformText) {
		const value = transformText ? transformText(text) : text;
		container.appendChild(container.ownerDocument.createTextNode(value));
	}

	function RenderParts(container, parts, transformText) {
		if (!Array.isArray(parts) || parts.length === 0)
			return false;

		container.replaceChildren();

		for (const part of parts) {
			const type = String(GetPartValue(part, "type", "Type") ?? "text").toLowerCase();
			const text = String(GetPartValue(part, "text", "Text") ?? "");
			const imageUrl = GetPartValue(part, "imageUrl", "ImageUrl");
			const isCheer = type === "cheer" || type === "cheermote";

			if ((type === "emote" || isCheer) && imageUrl) {
				const image = CreateEmoteImage(container.ownerDocument, imageUrl, isCheer ? "" : text);

				if (GetPartValue(part, "zeroWidth", "ZeroWidth"))
					image.classList.add("zero-width-emote");

				container.appendChild(image);

				if (isCheer) {
					const bits = GetPartValue(part, "bits", "Bits");
					const color = GetPartValue(part, "color", "Color");
					const bitsElement = container.ownerDocument.createElement("span");
					bitsElement.classList.add("bits");
					bitsElement.textContent = String(bits ?? text.match(/\d+$/)?.[0] ?? "");
					bitsElement.setAttribute("aria-label", text);

					if (color)
						bitsElement.style.color = color;

					container.appendChild(bitsElement);
				}

				continue;
			}

			AppendText(container, text, type === "text" ? transformText : undefined);
		}

		return true;
	}

	function CreateEmoteImage(document, imageUrl, alt) {
		const image = document.createElement("img");
		image.src = imageUrl;
		image.alt = alt;
		image.classList.add("emote");
		return image;
	}

	// Splits the container's text nodes around each match, so message text is never parsed as HTML.
	function ReplaceTextMatches(container, pattern, createNodes) {
		const document = container.ownerDocument;

		for (const node of Array.from(container.childNodes)) {
			if (node.nodeType !== TEXT_NODE)
				continue;

			const text = node.nodeValue;
			const nodes = [];
			let lastIndex = 0;

			for (const match of text.matchAll(pattern)) {
				if (match.index > lastIndex)
					nodes.push(document.createTextNode(text.slice(lastIndex, match.index)));

				nodes.push(...createNodes(document, match[0]));
				lastIndex = match.index + match[0].length;
			}

			if (nodes.length === 0)
				continue;

			if (lastIndex < text.length)
				nodes.push(document.createTextNode(text.slice(lastIndex)));

			node.replaceWith(...nodes);
		}
	}

	function RenderEmotes(container, emotes) {
		for (const emote of emotes ?? []) {
			const imageUrl = GetPartValue(emote, "imageUrl", "ImageUrl");
			const name = GetPartValue(emote, "name", "Name");
			if (!imageUrl || !name)
				continue;

			ReplaceTextMatches(
				container,
				new RegExp(`(?<!\\w)${EscapeRegExp(name)}(?!\\w)`, "g"),
				(document) => [CreateEmoteImage(document, imageUrl, name)],
			);
		}
	}

	function RenderFallback(container, emotes, cheerEmotes, totalBits) {
		RenderEmotes(container, emotes);

		for (const cheerEmote of cheerEmotes ?? []) {
			const bits = GetPartValue(cheerEmote, "bits", "Bits") ?? totalBits;
			const color = GetPartValue(cheerEmote, "color", "Color");
			const imageUrl = GetPartValue(cheerEmote, "imageUrl", "ImageUrl");
			const name = GetPartValue(cheerEmote, "name", "Name");
			if (bits == null || !imageUrl || !name)
				continue;

			ReplaceTextMatches(
				container,
				new RegExp(`\\b${EscapeRegExp(name)}${bits}\\b`, "gi"),
				(document) => {
					const amount = document.createElement("span");
					amount.classList.add("bits");
					amount.textContent = String(bits);

					if (color)
						amount.style.color = color;

					return [CreateEmoteImage(document, imageUrl, ""), amount];
				},
			);
		}
	}

	global.TwitchMessageRendering = { RenderParts, RenderEmotes, RenderFallback };
})(globalThis);
