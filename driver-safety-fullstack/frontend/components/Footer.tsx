"use client";
import { Shield, Twitter, Linkedin, Github, Mail } from "lucide-react";

const links = {
  Product: ["Features", "Demo", "Technology", "Pricing", "Changelog"],
  Company: ["About", "Blog", "Careers", "Press", "Contact"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR", "Security"],
  Developers: ["API Docs", "SDK", "Webhooks", "Status", "Community"],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-violet-500/10 pt-20 pb-12 px-6 lg:px-8 overflow-hidden">
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

      {/* Blob */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-violet-700/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-16">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 opacity-40 blur-md -z-10" />
              </div>
              <span className="text-white font-bold text-xl">
                DriverSafety<span className="text-violet-400">AI</span>
              </span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs mb-6">
              Real-time AI-powered driver monitoring. Preventing accidents, protecting lives, one trip at a time.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg glass border border-violet-500/20 flex items-center justify-center text-white/40 hover:text-violet-400 hover:border-violet-500/50 transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">{category}</h4>
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-white/40 text-sm hover:text-violet-400 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-violet-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-sm">
            © 2025 Driver Safety AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-white/25 text-xs">
            <span>SOC 2 Type II</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>ISO 27001</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>GDPR Compliant</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
              <span className="text-green-400/70">All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
