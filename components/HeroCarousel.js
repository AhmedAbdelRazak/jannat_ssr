"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ARABIC_BRAND_NAME, BRAND_NAME, DEFAULT_HERO_IMAGES } from "../lib/constants";
import { stripHtml } from "../lib/format";
import HeroSkyEffect from "./HeroSkyEffect";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

export default function HeroCarousel({ website = {} }) {
	const { isArabic, hrefWithLanguage } = useJannatApp();
	const slides = useMemo(() => {
		const source =
			Array.isArray(website?.homeMainBanners) && website.homeMainBanners.length
				? website.homeMainBanners
				: DEFAULT_HERO_IMAGES.map((url) => ({ url }));
		const fallbackTitles = isArabic
			? [ARABIC_BRAND_NAME, "إقامة بثقة", "رحلتك تبدأ من اختيار واضح"]
			: [BRAND_NAME, "Stay With Confidence", "Designed Around Your Trip"];
		const fallbackCopy = isArabic
			? [
					"فنادق مختارة وخدمة واضحة لحجوزات مكة والمدينة.",
					"تصفح الغرف المتاحة واجعل خطوتك القادمة أكثر وضوحا.",
					"اعثر على نوع الغرفة والفندق المناسب لخطتك.",
			  ]
			: [
					"Selected Makkah and Madinah hotel stays with responsive booking support.",
					"Browse available rooms and book your next stay with confidence.",
					"Find the room type and hotel setting that fits your plans.",
			  ];
		return source.map((slide, index) => ({
			image: slide.url || DEFAULT_HERO_IMAGES[index % DEFAULT_HERO_IMAGES.length],
			title: stripHtml(
				isArabic
					? slide.titleArabic || slide.titleAr || fallbackTitles[index % fallbackTitles.length]
					: slide.title || fallbackTitles[index % fallbackTitles.length]
			),
			subtitle: stripHtml(
				isArabic
					? slide.subTitleArabic ||
							slide.subtitleArabic ||
							slide.subTitleAr ||
							fallbackCopy[index % fallbackCopy.length]
					: slide.subTitle || slide.subtitle || fallbackCopy[index % fallbackCopy.length]
			),
			buttonTitle:
				stripHtml(
					(isArabic && (slide.buttonTitleArabic || slide.buttonTitleAr)) ||
						(!isArabic && slide.buttonTitle) ||
						(isArabic ? "استكشف الفنادق" : "Explore hotels")
				),
			href: slide.pageRedirectURL || "/our-hotels",
		}));
	}, [isArabic, website]);
	const [active, setActive] = useState(0);
	const activeRef = useRef(0);
	const initialRenderRef = useRef(true);
	const [previousActive, setPreviousActive] = useState(null);
	const [hasEntered, setHasEntered] = useState(true);
	const current = slides[active] || slides[0];
	const visibleSlideIndexes = previousActive !== null && previousActive !== active ? [previousActive, active] : [active];

	useEffect(() => {
		activeRef.current = active;
	}, [active]);

	useEffect(() => {
		if (initialRenderRef.current) {
			initialRenderRef.current = false;
			return undefined;
		}
		setHasEntered(false);
		const frame = window.requestAnimationFrame(() => setHasEntered(true));
		const cleanup = window.setTimeout(() => setPreviousActive(null), 950);
		return () => {
			window.cancelAnimationFrame(frame);
			window.clearTimeout(cleanup);
		};
	}, [active]);

	const changeActive = useCallback(
		(nextIndex) => {
			if (!slides.length) return;
			const normalized = (nextIndex + slides.length) % slides.length;
			if (normalized === activeRef.current) return;
			setPreviousActive(activeRef.current);
			activeRef.current = normalized;
			setActive(normalized);
		},
		[slides.length]
	);

	useEffect(() => {
		if (slides.length < 2) return undefined;
		const timer = setInterval(() => {
			changeActive(activeRef.current + 1);
		}, 6200);
		return () => clearInterval(timer);
	}, [changeActive, slides.length]);

	const go = (direction) => {
		changeActive(activeRef.current + direction);
	};

	return (
		<section className="hero" aria-label={`${isArabic ? ARABIC_BRAND_NAME : BRAND_NAME} featured stays`} dir={isArabic ? "rtl" : "ltr"}>
			{visibleSlideIndexes.map((index) => {
				const slide = slides[index] || slides[0];
				const isActive = index === active;
				return (
					<div
						key={`${slide.image}-${index}`}
						className={`hero-slide ${isActive && hasEntered ? "active" : ""} ${!isActive ? "leaving" : ""}`}
					>
						<OptimizedImage
							className="hero-slide-image"
							src={slide.image}
							alt=""
							fill
							priority={index === 0}
							loading={isActive ? "eager" : undefined}
							sizes="100vw"
							quality={66}
							unoptimized={false}
							aria-hidden="true"
						/>
					</div>
				);
			})}
			<div className="hero-overlay" />
			<HeroSkyEffect density="compact" />
			<div className="container hero-content">
				<p className="hero-kicker">{isArabic ? ARABIC_BRAND_NAME : BRAND_NAME}</p>
				<h1>{current.title}</h1>
				<p>{current.subtitle}</p>
				<div className="hero-actions">
					<Link className="btn btn-primary" href={hrefWithLanguage(current.href)}>
						{current.buttonTitle}
						<ArrowRight size={18} />
					</Link>
					<Link className="btn btn-ghost" href={hrefWithLanguage("/rooms")}>
						{isArabic ? "تحقق من التواريخ" : "Check dates"}
					</Link>
				</div>
			</div>
			<div className="hero-controls">
				<button type="button" aria-label="Previous slide" onClick={() => go(-1)}>
					<ChevronLeft size={20} />
				</button>
				<button type="button" aria-label="Next slide" onClick={() => go(1)}>
					<ChevronRight size={20} />
				</button>
			</div>
			<div className="hero-dots" aria-hidden="true">
				{slides.map((_, index) => (
					<span key={index} className={index === active ? "active" : ""} />
				))}
			</div>
		</section>
	);
}
