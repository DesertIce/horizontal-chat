"use strict";

// A minimal DOM covering the node APIs the overlay uses to render untrusted text.

function CreateDocument() {
	const document = {
		createElement(tagName) {
			return CreateElement(document, tagName);
		},
		createTextNode(text) {
			return CreateTextNode(document, text);
		},
	};

	return document;
}

function Adopt(parent, child) {
	const node = typeof child === "string" ? CreateTextNode(parent.ownerDocument, child) : child;
	node.parentNode = parent;
	return node;
}

function CreateTextNode(document, text) {
	return {
		nodeType: 3,
		nodeValue: String(text),
		ownerDocument: document,
		parentNode: null,
		get textContent() {
			return this.nodeValue;
		},
		replaceWith(...nodes) {
			const siblings = this.parentNode.childNodes;
			siblings.splice(siblings.indexOf(this), 1, ...nodes.map((node) => Adopt(this.parentNode, node)));
		},
	};
}

function CreateElement(document, tagName) {
	const classes = new Set();

	return {
		nodeType: 1,
		tagName: tagName.toUpperCase(),
		ownerDocument: document,
		parentNode: null,
		childNodes: [],
		classList: {
			add(className) {
				classes.add(className);
			},
			contains(className) {
				return classes.has(className);
			},
		},
		get className() {
			return [...classes].join(" ");
		},
		style: {},
		attributes: {},
		get textContent() {
			return this.childNodes.map((node) => node.textContent).join("");
		},
		set textContent(text) {
			this.replaceChildren(...(text === "" ? [] : [String(text)]));
		},
		appendChild(child) {
			this.childNodes.push(Adopt(this, child));
			return child;
		},
		replaceChildren(...children) {
			this.childNodes = children.map((child) => Adopt(this, child));
		},
		setAttribute(name, value) {
			this.attributes[name] = value;
		},
	};
}

// Serializes nodes as HTML, escaping text, so tests can see exactly what became markup.
function Serialize(node) {
	if (node.nodeType === 3)
		return node.nodeValue.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

	const tagName = node.tagName.toLowerCase();
	const attributes = [
		node.src !== undefined ? ` src="${node.src}"` : "",
		node.className ? ` class="${node.className}"` : "",
		node.style.color ? ` style="color: ${node.style.color}"` : "",
	].join("");

	if (tagName === "img")
		return `<img${attributes}>`;

	return `<${tagName}${attributes}>${node.childNodes.map(Serialize).join("")}</${tagName}>`;
}

function SerializeChildren(node) {
	return node.childNodes.map(Serialize).join("");
}

module.exports = { CreateDocument, Serialize, SerializeChildren };
