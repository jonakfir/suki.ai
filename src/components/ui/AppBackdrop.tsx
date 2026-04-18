"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

// Floating product bottles that live in the side gutters of the app shell
// (to the LEFT and RIGHT of the centered max-w-3xl content column). Hidden on
// mobile where the content would overlap.

type Item = {
  src: string;
  style: React.CSSProperties;
  size: number;
  duration: number;
  delay: number;
  rotate: [number, number];
  drift: [number, number];
};

const IMAGES = {
  hydra:
    "https://images.pexels.com/photos/36433296/pexels-photo-36433296/free-photo-of-biocosmetics-hydra-glow-b5-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=400",
  lancome:
    "https://images.pexels.com/photos/31812004/pexels-photo-31812004/free-photo-of-lancome-advanced-genifique-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=400",
  niacinamide:
    "https://images.pexels.com/photos/32282462/pexels-photo-32282462/free-photo-of-precision-beauty-niacinamide-serum-product-shot.jpeg?auto=compress&cs=tinysrgb&w=400",
  vials:
    "https://images.pexels.com/photos/16233812/pexels-photo-16233812/free-photo-of-vials-of-cosmetics.jpeg?auto=compress&cs=tinysrgb&w=400",
};

// 6 items flanking the content column in the gutters. Content is max-w-3xl
// (~768px) centered; on >=1024px viewports there's ~125px+ of gutter each
// side, enough for a ~160px bottle.
const ITEMS: Item[] = [
  // Left gutter
  { src: IMAGES.hydra,       style: { top: "10%",  left: "3%"  },  size: 160, duration: 16, delay: 0,   rotate: [-8, 8],   drift: [-6, 12]  },
  { src: IMAGES.niacinamide, style: { top: "48%",  left: "1%"  },  size: 140, duration: 20, delay: 2,   rotate: [-10, 6],  drift: [8, -10]  },
  { src: IMAGES.vials,       style: { bottom: "12%", left: "4%" }, size: 150, duration: 22, delay: 4,   rotate: [6, -10],  drift: [-8, 14]  },
  // Right gutter
  { src: IMAGES.lancome,     style: { top: "14%",  right: "3%" },  size: 170, duration: 18, delay: 1,   rotate: [10, -6],  drift: [10, -8]  },
  { src: IMAGES.hydra,       style: { top: "52%",  right: "1%" },  size: 130, duration: 24, delay: 3,   rotate: [-6, 10],  drift: [-10, 8]  },
  { src: IMAGES.niacinamide, style: { bottom: "8%", right: "4%" }, size: 150, duration: 20, delay: 2.5, rotate: [8, -8],   drift: [12, -10] },
];

const APP_PATHS = [
  "/today",
  "/skin",
  "/hair",
  "/makeup",
  "/me",
  "/compare",
  "/progress",
  "/products",
  "/recommendations",
  "/routine",
  "/profile",
];

function isAppPath(pathname: string): boolean {
  return APP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function AppBackdrop() {
  const pathname = usePathname();
  if (!isAppPath(pathname)) return null;

  return (
    <div
      aria-hidden
      // Hidden on mobile (<lg) where the content takes the full width.
      // Fixed so they stay in place as the page scrolls.
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden hidden lg:block"
      style={{ perspective: "1200px" }}
    >
      {ITEMS.map((it, i) => (
        <motion.div
          key={i}
          className="absolute rounded-3xl overflow-hidden opacity-60 shadow-[0_20px_50px_-20px_rgba(30,91,184,0.35)]"
          style={{
            ...it.style,
            width: it.size,
            height: it.size * 1.2,
          }}
          initial={{ y: 0, x: 0, rotate: it.rotate[0] }}
          animate={{
            y: [0, it.drift[1], 0],
            x: [0, it.drift[0], 0],
            rotate: [it.rotate[0], it.rotate[1], it.rotate[0]],
          }}
          transition={{
            duration: it.duration,
            delay: it.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Image
            src={it.src}
            alt=""
            fill
            sizes={`${it.size}px`}
            className="object-cover"
          />
          {/* Soft edge fade so the rectangles melt into the background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 45%, transparent 55%, rgba(220,232,247,0.85) 95%)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
