import { Link } from "react-router-dom";

import { ArrowRightIcon } from "./Icons";


export function SectionHeading({ eyebrow, title, description, actionLabel, actionTo }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="section-copy">{description}</p> : null}
      </div>
      {actionLabel && actionTo ? (
        <Link className="section-link" to={actionTo}>
          {actionLabel}
          <ArrowRightIcon size={16} />
        </Link>
      ) : null}
    </div>
  );
}

