import { path } from '../lib/inventory.js';

export const Crumb = ({ db, loc }) => (
  <ol className="crumb">{path(db, loc).map((p, i) => <li key={i}>{p}</li>)}</ol>
);
