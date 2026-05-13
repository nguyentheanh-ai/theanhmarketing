import Image from "next/image";
import { siteConfig } from "@/data/site";
import type { BrandSettings } from "@/services/brandService";

type BrandMarkProps = {
  brand?: Pick<BrandSettings, "name" | "logoImage" | "logoMark">;
  className?: string;
  imageClassName?: string;
};

export function BrandMark({
  brand,
  className = "grid size-10 place-items-center overflow-hidden rounded-lg bg-white",
  imageClassName = "size-full object-contain",
}: BrandMarkProps) {
  const currentBrand = brand ?? siteConfig;

  return (
    <span className={className}>
      {currentBrand.logoImage ? (
        <Image
          alt={currentBrand.name}
          className={imageClassName}
          height={80}
          priority
          src={currentBrand.logoImage}
          unoptimized
          width={80}
        />
      ) : (
        currentBrand.logoMark
      )}
    </span>
  );
}
