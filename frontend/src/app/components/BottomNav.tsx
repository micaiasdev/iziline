import { NavLink } from "react-router-dom";
import { Car, Route as RouteIcon, SquarePen, User } from "lucide-react";
import "./BottomNav.css";

const upcomingItems = [
  { label: "Perfil", Icon: User },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <NavLink
        to="/viagens"
        className={({ isActive }) =>
          isActive ? "bottom-nav__item is-active" : "bottom-nav__item"
        }
      >
        <RouteIcon size={22} aria-hidden="true" />
        <span className="bottom-nav__label">Viagens</span>
      </NavLink>

      <NavLink
        to="/caronas"
        className={({ isActive }) =>
          isActive ? "bottom-nav__item is-active" : "bottom-nav__item"
        }
      >
        <Car size={22} aria-hidden="true" />
        <span className="bottom-nav__label">Caronas</span>
      </NavLink>

      <NavLink
        to="/minhas-viagens"
        className={({ isActive }) =>
          isActive ? "bottom-nav__item is-active" : "bottom-nav__item"
        }
      >
        <SquarePen size={22} aria-hidden="true" />
        <span className="bottom-nav__label">Reservas</span>
      </NavLink>

      {upcomingItems.map(({ label, Icon }) => (
        <span
          key={label}
          className="bottom-nav__item is-disabled"
          role="link"
          aria-disabled="true"
          aria-label={`${label} — em breve`}
          title="Em breve"
        >
          <Icon size={22} aria-hidden="true" />
          <span className="bottom-nav__label">{label}</span>
        </span>
      ))}
    </nav>
  );
}
