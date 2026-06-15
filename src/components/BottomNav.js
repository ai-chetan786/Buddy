import { useLocation } from 'react-router-dom';

// BottomNav is now EMPTY — Feed.js has its own built-in bottom nav.
// Profile.js also has its own bottom nav built in.
// All navigation happens inside each page component.
// This file exists only to avoid import errors if anything still references it.

export default function BottomNav() {
  return null;
}
