import Image from "next/image";
import { normalizeImageUrl } from "../lib/images";

export default function OptimizedImage({
	src,
	alt = "",
	priority = false,
	loading,
	quality = 78,
	sizes = "100vw",
	...props
}) {
	const normalizedSrc = normalizeImageUrl(src);
	if (!normalizedSrc) return null;

	const imageProps = {
		...props,
		src: normalizedSrc,
		alt,
		priority,
		quality,
		sizes,
		draggable: false,
	};

	if (priority) {
		imageProps.fetchPriority = "high";
		imageProps.loading = "eager";
	} else {
		imageProps.loading = loading || "lazy";
	}

	return <Image {...imageProps} />;
}
