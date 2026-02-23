import { ReactNode } from "react";
import { cx } from "../utils/cx";

type CardProps = {
  title?: string;
  description?: string;
  className?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function Card({ title, description, className, actions, children }: CardProps) {
  return (
    <section className={cx("glass p-4 md:p-5", className)}>
      {title || description || actions ? (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-1">
            {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
            {description ? <p className="text-sm text-textSecondary">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}
