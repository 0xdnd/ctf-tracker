import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Old notes URLs (/cpts, /cpts-manual) redirect to /notes so bookmarks keep working.
 * The query string and hash are kept, so links like ?note=<id> still open that note.
 */
export const LegacyNotesRedirect: React.FC = () => {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: '/notes', search, hash }} replace />;
};

export default LegacyNotesRedirect;
