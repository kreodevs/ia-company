import { Navigate, useParams } from "react-router-dom";

/** Legacy route — redirects to the War Room sidebar page. */
export default function ProductTeamPage() {
  const { productId } = useParams<{ productId: string }>();
  if (!productId) return <Navigate to="/war-room" replace />;
  return <Navigate to={`/war-room/${productId}`} replace />;
}
