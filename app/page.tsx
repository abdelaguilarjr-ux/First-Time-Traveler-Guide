"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from "framer-motion";
import Lenis from "lenis";

const HeroScene = dynamic(() => import("./components/HeroScene"), { ssr: false });

// ── Variants ──────────────────────────────────────────────────────────────────

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.1 },
  }),
};

const rollDown = {
  hidden: { opacity: 0, rotateX: -80, y: -16 },
  visible: (i = 0) => ({
    opacity: 1,
    rotateX: 0,
    y: 0,
    transition: {
      duration: 0.85,
      delay: i * 0.12,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  }),
};

// ── TiltCard ──────────────────────────────────────────────────────────────────

function TiltCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), {
    stiffness: 400,
    damping: 28,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), {
    stiffness: 400,
    damping: 28,
  });
  const glareX = useTransform(x, [-0.5, 0.5], ["10%", "90%"]);
  const glareY = useTransform(y, [-0.5, 0.5], ["10%", "90%"]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={onMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className={`relative ${className ?? ""}`}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl z-10"
        style={{
          background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.18), transparent 55%)`,
        }}
      />
      {children}
    </motion.div>
  );
}

// ── Counter ───────────────────────────────────────────────────────────────────

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionVal.set(target);
  }, [inView, motionVal, target]);

  useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const stats = [
  { value: 12000, suffix: "+", label: "Happy clients" },
  { value: 98, suffix: "%", label: "Satisfaction rate" },
  { value: 340, suffix: "%", label: "Average ROI" },
  { value: 24, suffix: "/7", label: "Support" },
];

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Lightning Fast",
    desc: "Optimized performance that keeps your audience engaged and converts visitors into customers.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Enterprise Security",
    desc: "Bank-grade encryption and compliance built-in. Your data stays safe, always.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    title: "Growth Analytics",
    desc: "Real-time dashboards that surface actionable insights and track what moves the needle.",
  },
];

const testimonials = [
  {
    quote: "This platform completely transformed how we reach our audience. Our conversions jumped 4x in just three months.",
    name: "Sofia Rivera",
    role: "CMO at Verve",
    avatar: "SR",
    color: "bg-sky-500",
  },
  {
    quote: "The analytics alone are worth it. Finally, a tool that shows us what actually matters — not just vanity metrics.",
    name: "James Okafor",
    role: "Growth Lead at Prism",
    avatar: "JO",
    color: "bg-orange-400",
  },
  {
    quote: "Onboarded our 50-person team in a day. The UX is so intuitive there was almost nothing to explain.",
    name: "Mia Chen",
    role: "Director of Ops, Novu",
    avatar: "MC",
    color: "bg-emerald-500",
  },
];

const logos = ["Verve", "Prism", "Novu", "Helix", "Orbit", "Crest"];

// ── Sections ──────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-4 left-4 right-4 z-50 max-w-6xl mx-auto rounded-2xl px-6 py-3 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-lg shadow-sky-100/50"
          : "bg-white/60 backdrop-blur-sm"
      }`}
    >
      <motion.span
        className="font-bold text-xl text-[#0C4A6E] tracking-tight cursor-default"
        whileHover={{ scale: 1.06 }}
      >
        acme.
      </motion.span>
      <div className="hidden md:flex gap-8 text-sm font-medium text-[#0C4A6E]/70">
        {["Features", "Pricing", "About", "Blog"].map((item) => (
          <motion.a
            key={item}
            href="#"
            className="hover:text-[#0EA5E9] transition-colors duration-200 cursor-pointer"
            whileHover={{ y: -1 }}
          >
            {item}
          </motion.a>
        ))}
      </div>
      <motion.a
        href="#"
        className="bg-[#F97316] text-white text-sm font-semibold px-5 py-2 rounded-xl cursor-pointer"
        whileHover={{ scale: 1.06, y: -1, backgroundColor: "#ea6c0a" }}
        whileTap={{ scale: 0.96 }}
      >
        Get started
      </motion.a>
    </motion.nav>
  );
}

function Hero() {
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 500], [0, 90]);
  const parallaxOpacity = useTransform(scrollY, [0, 320], [1, 0.4]);

  return (
    <section className="relative pt-40 pb-24 px-6 min-h-screen overflow-hidden flex flex-col">
      {/* WebGL 3D scene */}
      <div className="absolute inset-0 -z-10">
        <Suspense fallback={null}>
          <HeroScene />
        </Suspense>
      </div>

      {/* Gradient veil so text stays readable */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#F0F9FF]/68 via-[#F0F9FF]/58 to-[#F0F9FF]" />

      <motion.div
        style={{ y: parallaxY, opacity: parallaxOpacity }}
        className="max-w-6xl mx-auto text-center w-full"
      >
        {/* Badge */}
        <div style={{ perspective: 1200 }}>
          <motion.div
            variants={rollDown}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 bg-sky-100 text-[#0EA5E9] text-sm font-semibold px-4 py-1.5 rounded-full mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-pulse" />
            Now live — v2.0 is here
          </motion.div>
        </div>

        {/* Headline */}
        <div style={{ perspective: 1200 }}>
          <motion.h1
            variants={rollDown}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-5xl md:text-7xl font-extrabold text-[#0C4A6E] leading-[1.08] tracking-tight max-w-4xl mx-auto"
          >
            Marketing that{" "}
            <span className="text-[#0EA5E9]">actually</span>{" "}
            moves the needle
          </motion.h1>
        </div>

        {/* Sub */}
        <div style={{ perspective: 1200 }}>
          <motion.p
            variants={rollDown}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-6 text-lg md:text-xl text-[#0C4A6E]/60 max-w-2xl mx-auto leading-relaxed"
          >
            One platform for campaigns, analytics, and growth — built for teams who care about real results, not just pretty dashboards.
          </motion.p>
        </div>

        {/* CTAs */}
        <div style={{ perspective: 1200 }}>
          <motion.div
            variants={rollDown}
            initial="hidden"
            animate="visible"
            custom={3}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.a
              href="#"
              className="bg-[#0EA5E9] text-white font-semibold px-8 py-4 rounded-xl text-base cursor-pointer shadow-lg shadow-sky-200"
              whileHover={{ scale: 1.04, y: -3, boxShadow: "0 24px 48px rgba(14,165,233,0.38)" }}
              whileTap={{ scale: 0.97 }}
            >
              Start free trial
            </motion.a>
            <motion.a
              href="#"
              className="bg-white text-[#0C4A6E] font-semibold px-8 py-4 rounded-xl text-base border border-sky-100 cursor-pointer"
              whileHover={{ scale: 1.04, y: -3, borderColor: "#7dd3fc", backgroundColor: "#f0f9ff" }}
              whileTap={{ scale: 0.97 }}
            >
              Watch demo →
            </motion.a>
          </motion.div>
        </div>

        {/* Hero mockup */}
        <div style={{ perspective: 1200 }}>
          <motion.div
            variants={rollDown}
            initial="hidden"
            animate="visible"
            custom={4}
            className="mt-16 relative rounded-2xl overflow-hidden border border-sky-100 shadow-2xl shadow-sky-100/50 bg-white h-64 md:h-96 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-blue-50" />
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "linear-gradient(#0EA5E9 1px, transparent 1px), linear-gradient(90deg, #0EA5E9 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative flex flex-col items-center gap-3 text-[#0C4A6E]/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} className="w-16 h-16">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path strokeLinecap="round" d="M3 9h18M9 21V9" />
              </svg>
              <span className="text-sm font-medium">Product screenshot</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function Logos() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-12 px-6 border-y border-sky-100 bg-white/50 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.p
          variants={fadeIn}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="text-center text-sm font-medium text-[#0C4A6E]/40 uppercase tracking-widest mb-8"
        >
          Trusted by teams at
        </motion.p>
        {/* Infinite marquee */}
        <div className="relative overflow-hidden">
          <div className="marquee flex gap-12 md:gap-16 whitespace-nowrap">
            {[...logos, ...logos, ...logos].map((logo, i) => (
              <span
                key={`${logo}-${i}`}
                className="text-xl font-bold text-[#0C4A6E]/25 hover:text-[#0EA5E9]/60 transition-colors duration-300 cursor-default inline-block"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 px-6 max-w-5xl mx-auto">
      <div style={{ perspective: 1200 }} className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            variants={rollDown}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            custom={i}
            className="flex flex-col items-center gap-2"
          >
            <p className="text-4xl md:text-5xl font-extrabold text-[#0EA5E9]">
              <Counter target={s.value} suffix={s.suffix} />
            </p>
            <p className="text-sm text-[#0C4A6E]/60 font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 px-6 bg-white relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 -left-24 w-80 h-80 rounded-full bg-sky-100/60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 rounded-full bg-blue-100/50 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div style={{ perspective: 1200 }}>
          <motion.div
            variants={rollDown}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#0C4A6E] tracking-tight">
              Everything you need to grow
            </h2>
            <p className="mt-4 text-lg text-[#0C4A6E]/60 max-w-xl mx-auto">
              Stop stitching together tools. One platform handles the entire lifecycle.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={f.title} style={{ perspective: 1200 }}>
              <motion.div
                variants={rollDown}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                custom={i + 1}
              >
                <TiltCard className="bg-[#F0F9FF] rounded-2xl p-8 border border-sky-100 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-100/60 transition-colors duration-300 cursor-default group h-full">
                  <div className="w-12 h-12 rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center mb-5 group-hover:bg-[#0EA5E9]/20 transition-colors duration-200">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#0C4A6E] mb-2">{f.title}</h3>
                  <p className="text-[#0C4A6E]/60 leading-relaxed text-sm">{f.desc}</p>
                </TiltCard>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 px-6 max-w-6xl mx-auto">
      <div style={{ perspective: 1200 }}>
        <motion.div
          variants={rollDown}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#0C4A6E] tracking-tight">
            Real results, real people
          </h2>
          <p className="mt-4 text-lg text-[#0C4A6E]/60">Don&apos;t take our word for it.</p>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <div key={t.name} style={{ perspective: 1200 }}>
            <motion.div
              variants={rollDown}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              custom={i}
            >
              <TiltCard className="bg-white rounded-2xl p-8 border border-sky-100 shadow-sm cursor-default h-full">
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} className="w-4 h-4 text-[#F97316]" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[#0C4A6E]/80 leading-relaxed mb-6 text-sm">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0C4A6E] text-sm">{t.name}</p>
                    <p className="text-[#0C4A6E]/50 text-xs">{t.role}</p>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 px-6">
      <div style={{ perspective: 1200 }}>
        <motion.div
          variants={rollDown}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          custom={0}
          className="max-w-3xl mx-auto bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] rounded-3xl p-12 text-center text-white shadow-2xl shadow-sky-200 relative overflow-hidden"
        >
          {/* Orb accents */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <motion.h2
            variants={rollDown}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            custom={1}
            className="text-4xl md:text-5xl font-extrabold tracking-tight relative z-10"
          >
            Ready to grow faster?
          </motion.h2>
          <motion.p
            variants={rollDown}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            custom={2}
            className="mt-4 text-lg text-white/80 max-w-lg mx-auto relative z-10"
          >
            Join 12,000+ teams already using acme to drive real growth. No credit card required.
          </motion.p>
          <motion.div
            variants={rollDown}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            custom={3}
            className="mt-8 flex flex-col sm:flex-row gap-4 justify-center relative z-10"
          >
            <motion.a
              href="#"
              className="bg-[#F97316] text-white font-bold px-8 py-4 rounded-xl cursor-pointer shadow-lg shadow-orange-300/50"
              whileHover={{ scale: 1.06, y: -3, boxShadow: "0 24px 48px rgba(249,115,22,0.5)" }}
              whileTap={{ scale: 0.97 }}
            >
              Start free — no card needed
            </motion.a>
            <motion.a
              href="#"
              className="bg-white/20 text-white font-semibold px-8 py-4 rounded-xl cursor-pointer border border-white/30"
              whileHover={{ scale: 1.06, y: -3, backgroundColor: "rgba(255,255,255,0.28)" }}
              whileTap={{ scale: 0.97 }}
            >
              Talk to sales
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-sky-100 text-center text-sm text-[#0C4A6E]/40">
      <p>© 2026 acme. All rights reserved.</p>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="overflow-x-hidden">
        <Hero />
        <Logos />
        <Stats />
        <Features />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
