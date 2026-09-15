import Image from "next/image";

export function EventCoverImage({
  src,
  alt,
  variant,
}: {
  src: string;
  alt: string;
  variant: "hero" | "banner" | "thumb";
}) {
  if (variant === "hero") {
    return (
      <div className="cover-frame relative aspect-[2/1] w-full overflow-hidden rounded-xl sm:aspect-[21/9]">
        <Image
          src={src}
          alt={alt}
          fill
          priority
          className="object-contain"
          sizes="(min-width: 1024px) 1120px, 100vw"
        />
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className="cover-frame relative h-24 w-full overflow-hidden">
        <Image src={src} alt={alt} fill className="object-contain" sizes="(min-width: 768px) 50vw, 100vw" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={64}
      height={64}
      className="cover-frame h-12 w-12 shrink-0 rounded-lg object-cover"
    />
  );
}
