"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Coins } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { currencyOptions as buildCurrencyOptions } from "../lib/currency";
import { useJannatApp } from "./JannatAppProvider";

export default function CurrencySelector({ className = "", compact = false }) {
	const { currency, setCurrency, isArabic, language } = useJannatApp();
	const [isOpen, setIsOpen] = useState(false);
	const menuId = useId();
	const rootRef = useRef(null);
	const triggerRef = useRef(null);
	const optionRefs = useRef({});
	const options = useMemo(() => buildCurrencyOptions(language, !compact), [compact, language]);
	const menuOptions = useMemo(() => buildCurrencyOptions(language, true), [language]);
	const selectedOption = options.find((option) => option.value === currency) || options[0];
	const label = isArabic ? "\u0627\u0644\u0639\u0645\u0644\u0629" : "Currency";

	useEffect(() => {
		if (!isOpen) return undefined;

		const closeOnOutsideClick = (event) => {
			if (!rootRef.current?.contains(event.target)) setIsOpen(false);
		};

		const closeOnEscape = (event) => {
			if (event.key !== "Escape") return;
			setIsOpen(false);
			triggerRef.current?.focus();
		};

		document.addEventListener("pointerdown", closeOnOutsideClick);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsideClick);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return undefined;
		const frameId = window.requestAnimationFrame(() => {
			optionRefs.current[currency]?.focus();
		});
		return () => window.cancelAnimationFrame(frameId);
	}, [currency, isOpen]);

	const selectCurrency = (nextCurrency) => {
		setIsOpen(false);
		triggerRef.current?.focus();
		if (nextCurrency === currency) return;

		setCurrency(nextCurrency);
		trackConversion(
			"currencyChange",
			{ currency: nextCurrency.toUpperCase(), content_name: "Currency selector" },
			["CurrencyChanged_OurHotels", "Currency Changed"]
		);
	};

	const focusOption = (index) => {
		const nextOption = menuOptions[index];
		if (nextOption) optionRefs.current[nextOption.value]?.focus();
	};

	const handleOptionKeyDown = (event, index) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			focusOption((index + 1) % menuOptions.length);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			focusOption((index - 1 + menuOptions.length) % menuOptions.length);
			return;
		}
		if (event.key === "Home") {
			event.preventDefault();
			focusOption(0);
			return;
		}
		if (event.key === "End") {
			event.preventDefault();
			focusOption(menuOptions.length - 1);
		}
	};

	return (
		<div
			ref={rootRef}
			className={`currency-control ${compact ? "compact" : ""} ${isOpen ? "is-open" : ""} ${className}`.trim()}
			title={label}
			dir={isArabic ? "rtl" : "ltr"}
		>
			<button
				ref={triggerRef}
				type="button"
				className="currency-trigger"
				aria-label={`${label}: ${selectedOption?.label || ""}`}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				aria-controls={isOpen ? menuId : undefined}
				onClick={() => setIsOpen((open) => !open)}
			>
				<span className="currency-icon" aria-hidden="true">
					<Coins size={15} />
				</span>
				<span className="sr-only">{label}</span>
				<span className="currency-value">{selectedOption?.label}</span>
				<ChevronDown className="currency-chevron" size={15} aria-hidden="true" />
			</button>
			{isOpen ? (
				<div className="currency-menu" id={menuId} role="listbox" aria-label={label}>
					{menuOptions.map((option, index) => {
						const active = option.value === currency;
						return (
							<button
								ref={(node) => {
									optionRefs.current[option.value] = node;
								}}
								type="button"
								key={option.value}
								className={`currency-option ${active ? "is-active" : ""}`.trim()}
								role="option"
								aria-selected={active}
								tabIndex={active ? 0 : -1}
								onClick={() => selectCurrency(option.value)}
								onKeyDown={(event) => handleOptionKeyDown(event, index)}
							>
								<span className="currency-option-code">{option.code}</span>
								<span className="currency-option-copy">
									<span className="currency-option-label">{option.label}</span>
									<span className="currency-option-market">{option.market}</span>
								</span>
								<span className="currency-option-check" aria-hidden="true">
									{active ? <Check size={14} strokeWidth={3} /> : null}
								</span>
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
