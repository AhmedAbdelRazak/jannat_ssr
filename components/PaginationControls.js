"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useJannatApp } from "./JannatAppProvider";

const clampPage = (page, totalPages) =>
	Math.min(Math.max(Number(page) || 1, 1), Math.max(Number(totalPages) || 1, 1));

const visiblePages = (currentPage, totalPages) => {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}
	const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
	if (currentPage <= 3) {
		pages.add(2);
		pages.add(3);
		pages.add(4);
	}
	if (currentPage >= totalPages - 2) {
		pages.add(totalPages - 1);
		pages.add(totalPages - 2);
		pages.add(totalPages - 3);
	}
	return [...pages]
		.filter((page) => page >= 1 && page <= totalPages)
		.sort((first, second) => first - second)
		.reduce((items, page, index, sorted) => {
			if (index > 0 && page - sorted[index - 1] > 1) items.push("ellipsis");
			items.push(page);
			return items;
		}, []);
};

export default function PaginationControls({
	currentPage = 1,
	totalItems = 0,
	pageSize = 15,
	basePath = "",
	query = {},
	onPageChange,
	label,
}) {
	const { isArabic, language, currency } = useJannatApp();
	const totalPages = Math.ceil(Number(totalItems || 0) / pageSize);
	if (totalPages <= 1) return null;

	const page = clampPage(currentPage, totalPages);
	const from = (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, totalItems);
	const pages = visiblePages(page, totalPages);
	const previousLabel = isArabic ? "السابق" : "Previous";
	const nextLabel = isArabic ? "التالي" : "Next";
	const summaryLabel =
		label ||
		(isArabic
			? "عرض النتائج"
			: "Showing results");
	const totalLabel = isArabic ? "من" : "of";
	const pageLabel = isArabic ? "صفحة" : "Page";

	const hrefForPage = (targetPage) => {
		const params = new URLSearchParams();
		Object.entries(query || {}).forEach(([key, value]) => {
			if (value === undefined || value === null || value === "") return;
			if (Array.isArray(value)) {
				value.forEach((item) => {
					if (item !== undefined && item !== null && item !== "") params.append(key, item);
				});
				return;
			}
			params.set(key, String(value));
		});
		if (!params.has("lang")) params.set("lang", language);
		if (!params.has("currency")) params.set("currency", currency);
		if (targetPage > 1) {
			params.set("page", String(targetPage));
		} else {
			params.delete("page");
		}
		const search = params.toString();
		return `${basePath || ""}${search ? `?${search}` : ""}`;
	};

	const renderControl = (targetPage, content, className, ariaLabel, disabled = false) => {
		const safeTargetPage = clampPage(targetPage, totalPages);
		if (onPageChange) {
			return (
				<button
					type="button"
					className={className}
					onClick={() => onPageChange(safeTargetPage)}
					disabled={disabled}
					aria-label={ariaLabel}
				>
					{content}
				</button>
			);
		}
		return disabled ? (
			<span className={`${className} is-disabled`} aria-disabled="true">
				{content}
			</span>
		) : (
			<Link className={className} href={hrefForPage(safeTargetPage)} aria-label={ariaLabel}>
				{content}
			</Link>
		);
	};

	return (
		<nav className="pagination-shell" dir={isArabic ? "rtl" : "ltr"} aria-label={isArabic ? "التصفح بين الصفحات" : "Pagination"}>
			<p className="pagination-summary">
				{summaryLabel} <bdi dir="ltr">{from}-{to}</bdi> {totalLabel} <bdi dir="ltr">{totalItems}</bdi>
			</p>
			<div className="pagination-list">
				{renderControl(
					page - 1,
					<>
						<ChevronLeft size={16} />
						<span>{previousLabel}</span>
					</>,
					"pagination-arrow",
					previousLabel,
					page <= 1
				)}
				{pages.map((item, index) =>
					item === "ellipsis" ? (
						<span className="pagination-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">
							<MoreHorizontal size={18} />
						</span>
					) : (
						renderControl(
							item,
							<bdi dir="ltr">{item}</bdi>,
							`pagination-page ${item === page ? "is-active" : ""}`,
							`${pageLabel} ${item}`,
							item === page
						)
					)
				)}
				{renderControl(
					page + 1,
					<>
						<span>{nextLabel}</span>
						<ChevronRight size={16} />
					</>,
					"pagination-arrow",
					nextLabel,
					page >= totalPages
				)}
			</div>
		</nav>
	);
}
