"use client";

import { useId } from "react";

const COMPACT_STARS = [
	["5%", "31%", "11px", "-0.2s", "4.8s", "rgba(246, 221, 158, 0.9)", "-10deg"],
	["12%", "61%", "7px", "-1.5s", "5.7s", "rgba(215, 235, 255, 0.86)", "12deg"],
	["18%", "22%", "8px", "-0.8s", "4.3s", "rgba(255, 255, 255, 0.82)", "18deg"],
	["23%", "49%", "9px", "-2.2s", "6.1s", "rgba(68, 210, 230, 0.74)", "-18deg"],
	["31%", "72%", "7px", "-1s", "5.4s", "rgba(255, 255, 255, 0.78)", "8deg"],
	["37%", "29%", "10px", "-3s", "6.4s", "rgba(215, 235, 255, 0.86)", "-8deg"],
	["44%", "57%", "8px", "-1.8s", "4.9s", "rgba(246, 221, 158, 0.82)", "16deg"],
	["52%", "37%", "12px", "-0.5s", "5.8s", "rgba(255, 255, 255, 0.9)", "-14deg"],
	["59%", "76%", "6px", "-2.6s", "4.7s", "rgba(215, 235, 255, 0.72)", "6deg"],
	["66%", "24%", "8px", "-1.2s", "5.6s", "rgba(246, 221, 158, 0.84)", "-18deg"],
	["73%", "54%", "11px", "-3.4s", "6.2s", "rgba(255, 255, 255, 0.84)", "10deg"],
	["82%", "35%", "7px", "-0.9s", "5s", "rgba(68, 210, 230, 0.74)", "-6deg"],
	["89%", "67%", "9px", "-2.9s", "6s", "rgba(246, 221, 158, 0.82)", "14deg"],
	["96%", "27%", "8px", "-1.9s", "5.2s", "rgba(215, 235, 255, 0.78)", "-12deg"],
];

const FULL_STARS = [
	...COMPACT_STARS,
	["8%", "77%", "6px", "-3.2s", "5.5s", "rgba(255, 255, 255, 0.78)", "18deg"],
	["16%", "39%", "12px", "-2.7s", "6.5s", "rgba(246, 221, 158, 0.84)", "-16deg"],
	["27%", "17%", "8px", "-4.1s", "5.1s", "rgba(68, 210, 230, 0.72)", "7deg"],
	["34%", "42%", "7px", "-3.6s", "4.6s", "rgba(255, 255, 255, 0.8)", "-9deg"],
	["41%", "83%", "10px", "-2.4s", "6.3s", "rgba(215, 235, 255, 0.82)", "15deg"],
	["49%", "19%", "6px", "-1.4s", "5.9s", "rgba(246, 221, 158, 0.82)", "-7deg"],
	["56%", "62%", "9px", "-4.7s", "6.8s", "rgba(255, 255, 255, 0.82)", "12deg"],
	["63%", "44%", "7px", "-2s", "4.8s", "rgba(68, 210, 230, 0.72)", "-18deg"],
	["71%", "81%", "11px", "-3.8s", "5.7s", "rgba(246, 221, 158, 0.82)", "9deg"],
	["78%", "18%", "8px", "-2.8s", "6.1s", "rgba(255, 255, 255, 0.8)", "-11deg"],
	["87%", "47%", "12px", "-4.4s", "6.6s", "rgba(215, 235, 255, 0.84)", "14deg"],
	["94%", "83%", "7px", "-3.1s", "5.3s", "rgba(246, 221, 158, 0.76)", "-10deg"],
];

const toStarStyle = ([x, y, size, delay, duration, color, rotate]) => ({
	"--star-x": x,
	"--star-y": y,
	"--star-size": size,
	"--star-delay": delay,
	"--star-duration": duration,
	"--star-color": color,
	"--star-rotate": rotate,
});

const GLINT_PATH = "M0 -7 1.8 -1.8 7 0 1.8 1.8 0 7 -1.8 1.8 -7 0 -1.8 -1.8Z";

export default function HeroSkyEffect({ density = "full" }) {
	const maskId = `hero-crescent-mask-${useId().replace(/:/g, "")}`;
	const stars = density === "compact" ? COMPACT_STARS : FULL_STARS;

	return (
		<div className={`hero-sky-effects ${density === "compact" ? "is-compact" : "is-full"}`} aria-hidden="true">
			{stars.map((star, index) => (
				<span className="hero-shine-star" style={toStarStyle(star)} key={`${star[0]}-${star[1]}-${index}`}>
					*
				</span>
			))}
			<svg className="hero-crescent" viewBox="0 0 100 100" focusable="false">
				<mask id={maskId}>
					<rect width="100" height="100" fill="white" />
					<circle cx="63" cy="43" r="43" fill="black" />
				</mask>
				<circle className="hero-crescent-shape" cx="43" cy="55" r="42" mask={`url(#${maskId})`} />
				<path className="hero-crescent-glint" d={GLINT_PATH} transform="translate(34 32)" />
				<path className="hero-crescent-glint hero-crescent-glint-small" d={GLINT_PATH} transform="translate(58 70) scale(.72)" />
			</svg>
		</div>
	);
}
