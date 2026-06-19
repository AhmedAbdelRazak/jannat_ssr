"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { Badge, Button, DatePicker, Divider, Drawer, Empty, InputNumber } from "antd";
import { BedDouble, CalendarDays, Moon, ShoppingCart, Trash2 } from "lucide-react";
import { trackConversion } from "../lib/analyticsEvents";
import { itemTotal } from "../lib/booking";
import OptimizedImage from "./OptimizedImage";
import { useJannatApp } from "./JannatAppProvider";

const DATE_FORMAT = "YYYY-MM-DD";

const cartDate = (value, fallbackDays = 1) => {
	const date = dayjs(value);
	return date.isValid() ? date : dayjs().add(fallbackDays, "day");
};

export default function CartDrawer() {
	const {
		cart,
		cartOpen,
		setCartOpen,
		t,
		isArabic,
		totals,
		hrefWithLanguage,
		updateCartItem,
		updateCartDates,
		removeCartItem,
		nightsBetween,
		formatCurrency,
	} = useJannatApp();
	const today = dayjs().startOf("day");
	const stayDatesLabel = isArabic ? "\u062a\u0648\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0642\u0627\u0645\u0629" : "Stay dates";
	const firstItem = cart[0] || {};
	const cartCheckIn = cartDate(firstItem.checkIn, 1);
	const cartCheckOut = dayjs(firstItem.checkOut).isAfter(cartCheckIn)
		? cartDate(firstItem.checkOut, 4)
		: cartCheckIn.add(1, "day");

	const handleCheckInChange = (date) => {
		if (!date) return;
		const currentNights = nightsBetween(firstItem.checkIn, firstItem.checkOut);
		const checkIn = date.format(DATE_FORMAT);
		let checkOutDate = cartCheckOut;
		if (!checkOutDate.isAfter(date)) {
			checkOutDate = date.add(Math.max(1, currentNights), "day");
		}
		updateCartDates(checkIn, checkOutDate.format(DATE_FORMAT));
	};

	const handleCheckOutChange = (date) => {
		if (!date) return;
		const checkOut = date.isAfter(cartCheckIn)
			? date.format(DATE_FORMAT)
			: cartCheckIn.add(1, "day").format(DATE_FORMAT);
		updateCartDates(cartCheckIn.format(DATE_FORMAT), checkOut);
	};

	return (
		<Drawer
			title={
				<span className="cart-title">
					<ShoppingCart size={18} />
					{t("yourCart")}
					<Badge count={totals.rooms} color="#0f8f70" />
				</span>
			}
			open={cartOpen}
			onClose={() => setCartOpen(false)}
			size={440}
			className="jannat-cart-drawer"
		>
			{cart.length ? (
				<div className="cart-drawer-body">
					<div className="cart-date-editor cart-date-editor-shared">
						<label>
							<CalendarDays size={14} />
							{stayDatesLabel}
						</label>
						<div className="cart-date-picker-grid">
							<div className="cart-date-field">
								<span>{t("checkIn")}</span>
								<DatePicker
									className="cart-date-picker"
									value={cartCheckIn}
									format={DATE_FORMAT}
									allowClear={false}
									disabledDate={(current) => current && current < today}
									onChange={handleCheckInChange}
									placement={isArabic ? "bottomRight" : "bottomLeft"}
								/>
							</div>
							<div className="cart-date-field">
								<span>{t("checkOut")}</span>
								<DatePicker
									className="cart-date-picker"
									value={cartCheckOut}
									format={DATE_FORMAT}
									allowClear={false}
									disabledDate={(current) => current && current <= cartCheckIn.startOf("day")}
									onChange={handleCheckOutChange}
									placement={isArabic ? "bottomRight" : "bottomLeft"}
								/>
							</div>
						</div>
					</div>
					<div className="cart-items">
						{cart.map((item) => {
							const nights = nightsBetween(item.checkIn, item.checkOut);
							return (
								<article className="cart-row" key={item.id}>
									{item.image ? (
										<OptimizedImage
											className="cart-row-image"
											src={item.image}
											alt={item.roomName}
											width={92}
											height={92}
											sizes="92px"
											quality={68}
										/>
									) : null}
									<div className="cart-row-content">
										<strong>{item.roomName}</strong>
										<span>{item.hotelName}</span>
										<small>
											<CalendarDays size={13} />
											<bdi dir="ltr" className="ltr-value">{item.checkIn} - {item.checkOut}</bdi>
											<span className="cart-date-dot" aria-hidden="true" />
											<span className="cart-nights-pill">
												<Moon size={13} />
												<bdi dir="ltr" className="ltr-value">{nights}</bdi>{" "}
												{nights > 1 ? t("nights") : t("night")}
											</span>
										</small>
										<div className="cart-row-actions">
											<InputNumber
												min={1}
												max={20}
												size="small"
												value={item.amount}
												onChange={(value) =>
													updateCartItem(item.id, { amount: Math.max(1, Number(value || 1)) })
												}
											/>
											<button type="button" onClick={() => removeCartItem(item.id)}>
												<Trash2 size={15} />
												{t("remove")}
											</button>
										</div>
										<div className="cart-line-total">
											<span dir="ltr" className="ltr-value">{formatCurrency(item.price)}</span>
											<strong dir="ltr" className="ltr-value">{formatCurrency(itemTotal(item))}</strong>
										</div>
									</div>
								</article>
							);
						})}
					</div>
					<Divider />
					<div className="cart-total">
						<span>{t("subtotal")}</span>
						<strong dir="ltr" className="ltr-value">{formatCurrency(totals.amount)}</strong>
					</div>
					<Link
						href={hrefWithLanguage("/checkout")}
						onClick={() => {
							trackConversion(
								"beginCheckout",
								{ value: totals.amount, currency: "SAR" },
								["Checkout Click"]
							);
							setCartOpen(false);
						}}
					>
						<Button type="primary" size="large" block icon={<BedDouble size={18} />}>
							{t("checkout")}
						</Button>
					</Link>
					<Button size="large" block onClick={() => setCartOpen(false)}>
						{t("continueShopping")}
					</Button>
				</div>
			) : (
				<div className="cart-empty">
					<Empty description={t("cartEmpty")} />
					<Link href={hrefWithLanguage("/our-hotels")} onClick={() => setCartOpen(false)}>
						<Button type="primary" block>
							{t("browseHotels")}
						</Button>
					</Link>
				</div>
			)}
		</Drawer>
	);
}
