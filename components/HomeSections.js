"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CurrencySelector from "./CurrencySelector";
import DestinationCards from "./DestinationCards";
import HotelGrid from "./HotelGrid";
import HomePromoBanner from "./HomePromoBanner";
import { useJannatApp } from "./JannatAppProvider";

export default function HomeSections({ website = {}, hotels = [] }) {
	const { t, isArabic, hrefWithLanguage } = useJannatApp();

	return (
		<>
			<DestinationCards />
			<HomePromoBanner banner={website.homeSecondBanner} position="second" />
			<section className="section hotels-section" dir={isArabic ? "rtl" : "ltr"}>
				<div className="container">
					<div className="section-head">
						<div>
							<p className="eyebrow">{t("featuredHotels")}</p>
							<h2 className="section-title">{t("exploreJannat")}</h2>
						</div>
						<div className="section-head-actions">
							<CurrencySelector compact className="section-currency-control" />
							<Link className="view-all" href={hrefWithLanguage("/our-hotels")}>
								{t("allHotels")} <ArrowRight size={17} />
							</Link>
						</div>
					</div>
					<HotelGrid hotels={hotels} limit={6} optimizeImages />
				</div>
			</section>
			<HomePromoBanner banner={website.homeThirdBanner} position="third" />
		</>
	);
}
