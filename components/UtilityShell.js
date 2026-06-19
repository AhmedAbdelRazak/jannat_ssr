import Link from "next/link";

export default function UtilityShell({ eyebrow = "Jannat Booking", title, copy, primaryHref = "/our-hotels", primaryLabel = "Browse hotels" }) {
	return (
		<section className="section utility-page">
			<div className="container confirmation-card premium-card">
				<p className="eyebrow">{eyebrow}</p>
				<h1>{title}</h1>
				<p>{copy}</p>
				<div className="hero-actions">
					<Link className="btn btn-primary" href={primaryHref}>
						{primaryLabel}
					</Link>
					<Link className="btn btn-ghost" href="/contact">
						Contact support
					</Link>
				</div>
			</div>
		</section>
	);
}
