"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type Item = {
  src: string;
  style: React.CSSProperties;
  size: number;
  duration: number;
  delay: number;
  rotate: [number, number];
  drift: [number, number];
  tilt: number;
};

const IMAGES = {
  hydra: "https://images.pexels.com/photos/36433296/pexels-photo-36433296/free-photo-of-biocosmetics-hydra-glow-b5-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=500",
  lancome: "https://images.pexels.com/photos/31812004/pexels-photo-31812004/free-photo-of-lancome-advanced-genifique-serum-bottle.jpeg?auto=compress&cs=tinysrgb&w=500",
  niacinamide: "https://images.pexels.com/photos/32282462/pexels-photo-32282462/free-photo-of-precision-beauty-niacinamide-serum-product-shot.jpeg?auto=compress&cs=tinysrgb&w=500",
  flatlay: "https://images.pexels.com/photos/3762881/pexels-photo-3762881.jpeg?auto=compress&cs=tinysrgb&w=500",
  vials: "https://images.pexels.com/photos/16233812/pexels-photo-16233812/free-photo-of-vials-of-cosmetics.jpeg?auto=compress&cs=tinysrgb&w=500",
};

const ITEMS: Item[] = [
  { src: IMAGES.hydra,       style: { top: "6%",  left: "4%"  }, size: 150, duration: 14, delay: 0,   rotate: [-8, 10],  drift: [-14, 18], tilt: -10 },
  { src: IMAGES.lancome,     style: { top: "14%", right: "6%" }, size: 170, duration: 18, delay: 1.5, rotate: [12, -8],  drift: [16, -12], tilt: 12  },
  { src: IMAGES.niacinamide, style: { top: "46%", left: "2%"  }, size: 130, duration: 16, delay: 3,   rotate: [-12, 14], drift: [12, -16], tilt: 8   },
  { src: IMAGES.flatlay,     style: { top: "58%", right: "3%" }, size: 190, duration: 22, delay: 2,   rotate: [10, -14], drift: [-20, 14], tilt: -14 },
  { src: IMAGES.vials,       style: { bottom: "8%", left: "12%" }, size: 140, duration: 17, delay: 0.8, rotate: [8, -10],  drift: [18, -14], tilt: 10  },
  { src: IMAGES.hydra,       style: { bottom: "18%", right: "16%" }, size: 110, duration: 20, delay: 4, rotate: [-10, 8], drift: [-12, 20], tilt: -6  },
];

export function FloatingProducts() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ perspective: "1200px" }}
    >
      {ITEMS.map((it, i) => (
        <motion.div
          key={i}
          className="absolute rounded-3xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(30,91,184,0.45)] opacity-60 mix-blend-luminosity"
          style={{
            ...it.style,
            width: it.size,
            height: it.size * 1.15,
            transformStyle: "preserve-3d",
          }}
          initial={{ y: 0, x: 0, rotate: it.rotate[0], rotateY: it.tilt }}
          animate={{
            y: [0, it.drift[1], 0],
            x: [0, it.drift[0], 0],
            rotate: [it.rotate[0], it.rotate[1], it.rotate[0]],
            rotateY: [it.tilt, -it.tilt, it.tilt],
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
          {/* Soft edge fade so it blends into the page */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, transparent 55%, rgba(220,232,247,0.85) 95%)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
