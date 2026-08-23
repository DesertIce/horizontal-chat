(function installTwitchMessageRendering(global) {
	"use strict";

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
				const image = container.ownerDocument.createElement("img");
				image.src = imageUrl;
				image.alt = isCheer ? "" : text;
				image.classList.add("emote");

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

	function RenderFallback(container, emotes, cheerEmotes, totalBits) {
		for (const emote of emotes ?? []) {
			const imageUrl = GetPartValue(emote, "imageUrl", "ImageUrl");
			const name = GetPartValue(emote, "name", "Name");
			if (!imageUrl || !name)
				continue;

			const escapedName = EscapeRegExp(name);
			const isWordEmote = /^\w+$/.test(name);
			const pattern = isWordEmote
				? `\\b${escapedName}\\b`
				: `(^|[^\\w])${escapedName}(?=$|[^\\w])`;
			const image = `<img src="${imageUrl}" class="emote"/>`;

			container.innerHTML = container.innerHTML.replace(
				new RegExp(pattern, "g"),
				(match, leadingBoundary) => isWordEmote ? image : leadingBoundary + image,
			);
		}

		for (const cheerEmote of cheerEmotes ?? []) {
			const bits = GetPartValue(cheerEmote, "bits", "Bits") ?? totalBits;
			const color = GetPartValue(cheerEmote, "color", "Color");
			const imageUrl = GetPartValue(cheerEmote, "imageUrl", "ImageUrl");
			const name = GetPartValue(cheerEmote, "name", "Name");
			if (bits == null || !imageUrl || !name)
				continue;

			const image = `<img src="${imageUrl}" class="emote"/>`;
			const colorStyle = color ? ` style="color: ${color}"` : "";
			const amount = `<span class="bits"${colorStyle}>${bits}</span>`;
			const pattern = `\\b${EscapeRegExp(name)}${bits}\\b`;
			container.innerHTML = container.innerHTML.replace(new RegExp(pattern, "gi"), image + amount);
		}
	}

	global.TwitchMessageRendering = { RenderParts, RenderFallback };
})(globalThis);
