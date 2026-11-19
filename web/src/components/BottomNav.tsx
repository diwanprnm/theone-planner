import { NavLink } from 'react-router-dom';
import { IconChart, IconHome, IconSettings } from './Icons';

const ITEMS = [
  { to: '/beranda', label: 'Beranda', Icon: IconHome },
  { to: '/laporan', label: 'Laporan', Icon: IconChart },
  { to: '/pengaturan', label: 'Pengaturan', Icon: IconSettings },
] as const;

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigasi utama">
      {ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
