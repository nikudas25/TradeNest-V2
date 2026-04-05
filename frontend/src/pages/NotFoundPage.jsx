import { Link } from "react-router-dom";


export function NotFoundPage() {
  return (
    <div className="container empty-panel">
      <h1>Page not found</h1>
      <p>The page you requested does not exist in this TradeNest marketplace.</p>
      <Link className="button button--primary" to="/">
        Back home
      </Link>
    </div>
  );
}
