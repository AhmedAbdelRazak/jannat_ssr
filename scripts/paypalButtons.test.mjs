import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (relativePath) =>
	readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("checkout and client payment use one adaptive PayPal button stack", async () => {
	for (const componentPath of [
		"components/CheckoutClient.js",
		"components/ClientPaymentLinkClient.js",
	]) {
		const source = await readSource(componentPath);
		assert.match(source, /import PayPalSmartButtons from "\.\/PayPalSmartButtons";/);
		assert.equal(source.match(/<PayPalSmartButtons\b/g)?.length, 1);
		assert.doesNotMatch(source, /fundingSource=["'](?:paypal|card)["']/);
	}
});

test("adaptive PayPal buttons keep a visible fallback for ineligible or failed rendering", async () => {
	const source = await readSource("components/PayPalSmartButtons.js");
	assert.match(source, /<PayPalButtons\b/);
	assert.match(source, /\{fallback\}/);
	assert.match(source, /if \(renderFailed\) return fallback;/);
	assert.doesNotMatch(source, /fundingSource=/);
});
