import Image from "next/image";

interface LogoThumbnailProps {
  src: string;
  size: number;
  className?: string;
}

// Company/sponsor logos are designed for the site's own dark background
// (--color-background, the same #141414 every public page renders on) -
// many are light/white artwork on a transparent PNG, which disappears
// against the white cards/tables the admin backoffice uses to display
// them. This dark chip, instead of the surrounding white, keeps them
// visible there and matches how they actually look on the live site.
const LogoThumbnail: React.FC<LogoThumbnailProps> = ({
  src,
  size,
  className,
}) => (
  <div
    className={`flex shrink-0 items-center justify-center rounded-full bg-background ${className ?? ""}`}
    style={{ width: size, height: size }}
  >
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="size-full rounded-full object-cover"
    />
  </div>
);

export default LogoThumbnail;
