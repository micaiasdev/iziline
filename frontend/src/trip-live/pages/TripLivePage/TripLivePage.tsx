import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getTripDetail as getPassengerTrip } from "../../../viagens/passageiro/service/rideService";
import { getTripDetail as getDriverTrip } from "../../../viagens/motorista/service/driverTripsService";
import { ApiError } from "../../../app/services/apiError";
import {
  finishTrip,
  getDriverLocation,
  postDriverLocation,
  primeSimulatedRoute,
} from "../../service/tripLiveService";
import { bearing, fractionForElapsed, pointAlongRoute, type LatLng } from "../../simulation";
import type { LiveRole } from "../../../types/tripLive";
import type { TripDetail } from "../../../types/trip";
import "./TripLivePage.css";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const POLL_INTERVAL_MS = 3500;

type LiveNavState = { role?: LiveRole; backTo?: string };

// Ícone do carro (divIcon, sem depender de assets do Leaflet): halo pulsante +
// disco teal com um glifo de carro que gira na direção do movimento.
function buildCarIcon(): L.DivIcon {
  return L.divIcon({
    className: "live-car",
    html: `
      <span class="live-car__pulse"></span>
      <span class="live-car__disc">
        <svg class="live-car__glyph" width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 17H3v-6l2-5h11l3 5h2v6h-2"/><circle cx="7.5" cy="17.5" r="1.5"/>
          <circle cx="16.5" cy="17.5" r="1.5"/>
        </svg>
      </span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function timeAgo(from: Date | null, nowMs: number): string {
  if (!from) {
    return "aguardando localização…";
  }
  const seconds = Math.max(0, Math.round((nowMs - from.getTime()) / 1000));
  if (seconds < 5) return "atualizado agora";
  if (seconds < 60) return `atualizado há ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `atualizado há ${minutes} min`;
}

export function TripLivePage() {
  const { tripId: tripIdParam } = useParams();
  const tripId = Number(tripIdParam);
  const navigate = useNavigate();
  const state = (useLocation().state as LiveNavState | null) ?? {};
  const role: LiveRole = state.role ?? "passenger";
  const backTo = state.backTo ?? (role === "driver" ? `/viagens/${tripId}` : "/minhas-viagens");

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [gpsWarning, setGpsWarning] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPosRef = useRef<LatLng | null>(null);
  const followRef = useRef(true); // segue o carro até o usuário arrastar o mapa

  const isDriverRealtime = role === "driver" && !USE_MOCK;

  // Carrega o detalhe da viagem (rota + paradas) e informa a rota ao simulador.
  useEffect(() => {
    let active = true;
    const fetchTrip = role === "driver" ? getDriverTrip : getPassengerTrip;

    fetchTrip(tripId)
      .then((result) => {
        if (!active) return;
        setTrip(result);
        if (result.line_trip?.coordinates?.length) {
          primeSimulatedRoute(tripId, result.line_trip.coordinates);
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(
            error instanceof ApiError ? error.message : "Não foi possível carregar a viagem."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [tripId, role]);

  // Inicializa o mapa uma vez, com a rota e as paradas.
  useEffect(() => {
    if (!containerRef.current || !trip) return;
    const coordinates = trip.line_trip?.coordinates;
    const center: [number, number] = coordinates?.length
      ? [coordinates[0][1], coordinates[0][0]]
      : [-5.0892, -42.8016];

    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true }).setView(
      center,
      12
    );
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    if (trip.line_trip) {
      const routeLayer = L.geoJSON(trip.line_trip, {
        style: { color: "#4f8f8c", weight: 5, opacity: 0.85 },
      }).addTo(map);
      const bounds = routeLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    trip.stops.forEach((stop) => {
      L.circleMarker([stop.location.latitude, stop.location.longitude], {
        radius: 5,
        color: "#3f7774",
        fillColor: "#ffffff",
        fillOpacity: 1,
        weight: 2,
      })
        .bindPopup(stop.location.name)
        .addTo(map);
    });

    // Se o usuário arrastar o mapa, paramos de seguir o carro automaticamente.
    map.on("dragstart", () => {
      followRef.current = false;
    });

    mapRef.current = map;
    const resize = window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [trip]);

  // Atualiza o marcador do motorista quando a posição muda.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverPos) return;

    const latLng: [number, number] = [driverPos.lat, driverPos.lng];
    if (!markerRef.current) {
      markerRef.current = L.marker(latLng, { icon: buildCarIcon(), zIndexOffset: 1000 }).addTo(map);
    } else {
      markerRef.current.setLatLng(latLng);
    }

    // Gira o glifo na direção do movimento.
    const prev = prevPosRef.current;
    if (prev) {
      const heading = bearing(prev, driverPos);
      const glyph = markerRef.current.getElement()?.querySelector<HTMLElement>(".live-car__glyph");
      if (glyph) glyph.style.transform = `rotate(${heading}deg)`;
    }
    prevPosRef.current = driverPos;

    if (followRef.current) {
      map.panTo(latLng, { animate: true });
    }
  }, [driverPos]);

  // Fonte de localização A — passageiro (qualquer modo) ou motorista no mock:
  // faz polling do GET e desenha a posição recebida.
  useEffect(() => {
    if (isDriverRealtime) return;

    let active = true;
    const poll = () => {
      getDriverLocation(tripId)
        .then((loc) => {
          if (!active) return;
          setDriverPos({ lat: loc.latitude, lng: loc.longitude });
          setUpdatedAt(new Date(loc.updated_at));
        })
        .catch(() => {
          /* falha transitória de polling é silenciosa */
        });
    };

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isDriverRealtime, tripId]);

  // Fonte de localização B — motorista real: usa o GPS do dispositivo e faz o
  // POST. Se o GPS falhar/for negado, cai no trajeto simulado (também postando).
  useEffect(() => {
    if (!isDriverRealtime) return;

    let fallbackInterval: number | null = null;
    const startFallback = () => {
      setGpsWarning("Sem acesso ao GPS — usando o trajeto simulado.");
      const coords = trip?.line_trip?.coordinates ?? [];
      const startedAt = Date.now();
      const tick = () => {
        const point = pointAlongRoute(coords, fractionForElapsed(Date.now() - startedAt));
        setDriverPos(point);
        setUpdatedAt(new Date());
        void postDriverLocation(tripId, point.lat, point.lng).catch(() => {});
      };
      tick();
      fallbackInterval = window.setInterval(tick, POLL_INTERVAL_MS);
    };

    let watchId: number | null = null;
    if (!navigator.geolocation) {
      startFallback();
    } else {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setDriverPos(point);
          setUpdatedAt(new Date());
          void postDriverLocation(tripId, point.lat, point.lng).catch(() => {});
        },
        () => startFallback(),
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (fallbackInterval != null) window.clearInterval(fallbackInterval);
    };
  }, [isDriverRealtime, tripId, trip]);

  // Relógio para o "atualizado há Xs".
  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const handleFinish = useCallback(async () => {
    setIsFinishing(true);
    setFinishError("");
    try {
      await finishTrip(tripId);
      navigate(backTo, { replace: true });
    } catch (error) {
      setFinishError(
        error instanceof ApiError ? error.message : "Não foi possível finalizar a viagem."
      );
      setIsFinishing(false);
    }
  }, [tripId, backTo, navigate]);

  const routeLabel = trip
    ? `${trip.origin_city.name} → ${trip.destine_city.name}`
    : `Viagem #${tripId}`;

  return (
    <div className="trip-live">
      <div className="trip-live__map" ref={containerRef} />

      <header className="trip-live__topbar">
        <button
          type="button"
          className="trip-live__back"
          onClick={() => navigate(backTo)}
          aria-label="Voltar"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <div className="trip-live__topbar-heading">
          <span className="trip-live__badge">Em andamento</span>
          <span className="trip-live__route">{routeLabel}</span>
        </div>
      </header>

      {loadError && <div className="trip-live__error" role="alert">{loadError}</div>}

      <section className="trip-live__sheet" aria-label="Detalhes da viagem em andamento">
        <div className="trip-live__grabber" aria-hidden="true" />

        <div className="trip-live__status">
          <span className="trip-live__pulse-dot" aria-hidden="true" />
          <div>
            <strong>
              {role === "driver" ? "Você está a caminho" : "Motorista a caminho"}
            </strong>
            <span className="trip-live__updated">{timeAgo(updatedAt, nowMs)}</span>
          </div>
        </div>

        {gpsWarning && <p className="trip-live__hint" role="status">{gpsWarning}</p>}

        <div className="trip-live__route-line">
          <span>{trip ? trip.origin_city.name : "Origem"}</span>
          <span className="trip-live__route-arrow" aria-hidden="true">→</span>
          <span>{trip ? trip.destine_city.name : "Destino"}</span>
        </div>

        <div className="trip-live__actions">
          <Link
            to={`/chat/viagem/${tripId}`}
            state={{ title: "Chat da viagem", subtitle: routeLabel, backTo: `/viagem/${tripId}/andamento` }}
            className="trip-live__chat"
          >
            <MessageCircle size={18} aria-hidden="true" />
            Chat da viagem
          </Link>

          {role === "driver" && (
            <button
              type="button"
              className="trip-live__finish"
              onClick={handleFinish}
              disabled={isFinishing}
            >
              {isFinishing ? "Finalizando…" : "Finalizar viagem"}
            </button>
          )}
        </div>

        {finishError && (
          <p className="trip-live__finish-error" role="alert">{finishError}</p>
        )}
      </section>
    </div>
  );
}
