(function installHorizontalChatFlags(global) {
	"use strict";

	async function RenderFlag(container, userId, enabled) {
		if (!enabled)
			return;

		const image = await global.TwitchFlagsJS.GetFlagImageElement(userId);
		if (!image)
			return;

		image.classList.add("user-flag");
		container.appendChild(image);
	}

	global.HorizontalChatFlags = { RenderFlag };
})(globalThis);
