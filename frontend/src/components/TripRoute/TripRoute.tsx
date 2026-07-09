import type { RoutePoint } from "./tripRoutePoints";
import "./TripRoute.css";

// Trajeto ordenado (origem → paradas → destino) com conector vertical.
// Componente-assinatura do design system (DESIGN.md, seção "Trip Route / Stops").
export function TripRouteList({ points }: { points: RoutePoint[] }) {
  return (
    <ol className="trip-route-list">
      {points.map((point, index) => (
        <li className="trip-route-list__item" key={`${point.role}-${index}`}>
          <div className="trip-route-list__marker" aria-hidden="true">
            <span className="trip-route-list__dot" />
            {index < points.length - 1 && (
              <span className="trip-route-list__line" />
            )}
          </div>
          <div className="trip-route-list__content">
            <span className="trip-route-list__role">{point.role}</span>
            <strong>{point.cityLabel}</strong>
            <span className="trip-route-list__address">{point.addressLabel}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
