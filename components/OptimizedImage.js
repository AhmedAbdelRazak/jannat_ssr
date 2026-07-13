import Image from "next/image";
import { normalizeImageUrl } from "../lib/images";
import { canOptimizeImageUrl } from "../lib/imageOptimization.mjs";

export default function OptimizedImage({
	src,
	alt = "",
	priority = false,
	loading,
	quality = 78,
	sizes = "100vw",
	unoptimized = true,
	...props
}) {
	const normalizedSrc = normalizeImageUrl(src);
	if (!normalizedSrc) return null;
	const safelyUnoptimized = unoptimized || !canOptimizeImageUrl(normalizedSrc);

	const imageProps = {
		...props,
		src: normalizedSrc,
		alt,
		priority,
		quality,
		sizes,
		unoptimized: safelyUnoptimized,
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
