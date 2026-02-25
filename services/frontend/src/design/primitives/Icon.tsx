import { IconType } from "react-icons";
import { cx } from "../utils/cx";

type IconSize = 16 | 20 | 24;

type IconProps = {
  glyph: IconType;
  size?: IconSize;
  className?: string;
  title?: string;
};

export function Icon({ glyph: Glyph, size = 20, className, title }: IconProps) {
  return (
    <span className={cx("inline-flex items-center justify-center", className)} aria-hidden={title ? undefined : "true"} title={title}>
      <Glyph size={size} />
    </span>
  );
}
