"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Menu, X, Zap } from "lucide-react";
import Link from "next/link";

const links = [
  { label: "Features", href: "#features" },
  { label: "Demo", href: "#demo" },
  { label: "Technology", href: "#technology" },
  { label: "Testimonials", href: "#testimonials" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLink = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "navbar-glass" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>

                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 opacity-40 blur-md -z-10" />
              </div>

              <span className="text-white font-bold text-lg tracking-tight">
                Driver
                <span className="gradient-text">Safety</span>
                <span className="text-violet-400">AI</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {links.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleLink(link.href)}
                  className="text-sm text-white/60 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Dashboard Button */}
            <div className="hidden md:flex items-center">
              <Link
                href="/dashboard"
                className="btn-glow text-white text-sm font-semibold px-6 py-2.5 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-white/70 hover:text-white"
            >
              {mobileOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-16 left-0 right-0 z-40 navbar-glass border-b border-violet-500/10 md:hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-4">

              {links.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleLink(link.href)}
                  className="text-left text-white/70 hover:text-white font-medium py-2 border-b border-white/5 last:border-0"
                >
                  {link.label}
                </button>
              ))}

              <div className="pt-3">

                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="btn-glow text-white text-sm font-semibold px-5 py-3 w-full flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}