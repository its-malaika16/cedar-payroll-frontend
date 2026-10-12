import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./navbar.css";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Logo */}

        <NavLink
          to="/"
          className="logo"
          onClick={closeMenu}
        >
          <img
            src="/assets/logo/payrolllogo.svg"
            alt="Cedar Payroll" />
        </NavLink>
        <nav
          className={`nav-links ${menuOpen ? "active" : ""
            }`}
        >
          <NavLink to="/" onClick={closeMenu}>
            Home
          </NavLink>

          <NavLink
            to="/services"
            onClick={closeMenu}
          >
            What We Offer
          </NavLink>

          <NavLink
            to="/whoweserve"
            onClick={closeMenu}
          >
            Who We Serve
          </NavLink>

          <NavLink
            to="/about"
            onClick={closeMenu}
          >
            About Cedar Payroll
          </NavLink>

          <NavLink
            to="/contact"
            onClick={closeMenu}
          >
            Contact Us
          </NavLink>
        </nav>

        {/* Right Side */}

        <div className="navbar-right">
          <NavLink
            to="/support"
            className="support-link"
          >
            Support
          </NavLink>

          <a href="/login" className="signin-btn" onClick={closeMenu}>
            Sign In
          </a>
        </div>

        {/* Mobile Hamburger */}

        <button
          className={`hamburger ${menuOpen ? "open" : ""
            }`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;