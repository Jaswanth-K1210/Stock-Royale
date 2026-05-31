import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiOutlineHome, HiOutlineGlobeAlt, HiOutlineLogout, HiOutlinePlusCircle } from "react-icons/hi";
import useAuthStore from "../../store/authStore";

const navItems = [
  { path: "/dashboard", label: "HQ_SYS", icon: HiOutlineHome },
  { path: "/rooms", label: "OPERATIONS", icon: HiOutlineGlobeAlt },
  { path: "/rooms/create", label: "INIT_ROOM", icon: HiOutlinePlusCircle },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg border-b border-border px-4 md:px-8 py-2 h-10 flex items-center">
      <div className="w-full flex items-center justify-between text-xs">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 text-gold">
          <span className="font-bold">STR_TERMINAL</span>
          <span className="text-text-faint">v2.1</span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-1 transition-colors ${
                  isActive ? "text-neon-blue font-bold" : "text-text-dim hover:text-text"
                }`}
              >
                <span>[{item.label}]</span>
              </Link>
            );
          })}
        </div>

        {/* User */}
        <div className="flex items-center gap-4">
          <Link
            to="/profile"
            className="flex items-center gap-2 text-text-dim hover:text-gold transition-colors"
          >
            <span>USR:{user.username}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-text-faint hover:text-bear transition-colors"
            title="Terminate Session"
          >
            <HiOutlineLogout />
          </button>
        </div>
      </div>
    </nav>
  );
}
