import { useParams } from "react-router-dom";

export default function AnalyticsView() {
  const { shortCode } = useParams();
  return (
    <div className="text-xiv text-app-text">
      Analytics scaffold for: {shortCode}
    </div>
  );
}
