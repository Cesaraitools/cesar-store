"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { LandingShowcase } from "@/lib/landing-showcase";

type Props = {
  lang: "ar" | "en";
  initialShowcase: LandingShowcase;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizePhase = (value: number, count: number) => {
  if (!count) return 0;
  return ((value % count) + count) % count;
};

export default function OrbitLandingHero({ lang, initialShowcase }: Props) {
  const isAr = lang === "ar";
  const [categories, setCategories] = useState(initialShowcase.categories);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const stageRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const phaseRef = useRef(0);
  const velocityRef = useRef(0);
  const targetVelocityRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const lastPointerMoveRef = useRef(0);
  const lastPointerXRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartPhaseRef = useRef(0);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragCapturedRef = useRef(false);
  const hoveredCardRef = useRef(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    if (categories.length >= 3) return;

    let cancelled = false;

    fetch("/api/landing-showcase", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Landing showcase request failed");
        return response.json() as Promise<LandingShowcase>;
      })
      .then((payload) => {
        if (cancelled) return;

        if (payload.categories.length >= 3) {
          setCategories(payload.categories.slice(0, 7));
          phaseRef.current = 0;
          activeIndexRef.current = 0;
          setActiveIndex(0);
        }

      })
      .catch(() => {
        // Keep the server-rendered category set if the retry fails.
      });

    return () => {
      cancelled = true;
    };
  }, [categories.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      reducedMotionRef.current = mediaQuery.matches;
    };

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  const positionCards = useCallback(
    (phase: number) => {
      const count = categories.length;
      if (!count) return;

      const stageWidth = stageRef.current?.clientWidth || 1200;
      const spacing = clamp(stageWidth * 0.18, 122, 255);
      const maxVisibleDistance = Math.min(3.25, count / 2 + 0.25);

      cardRefs.current.forEach((card, index) => {
        if (!card) return;

        let distance = index - phase;
        while (distance > count / 2) distance -= count;
        while (distance < -count / 2) distance += count;

        const absoluteDistance = Math.abs(distance);
        const translateX = distance * spacing;
        const translateY = 18 + absoluteDistance * absoluteDistance * 18;
        const scale = 1 - Math.min(absoluteDistance * 0.085, 0.3);
        const rotateY = distance * -8;
        const rotateZ = distance * 3.2;
        const opacity =
          absoluteDistance > maxVisibleDistance
            ? 0
            : clamp(1 - absoluteDistance * 0.13, 0.38, 1);

        card.style.transform = `translate3d(calc(-50% + ${translateX}px), ${translateY}px, ${
          -absoluteDistance * 70
        }px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(100 - Math.round(absoluteDistance * 12));
        card.style.pointerEvents = opacity < 0.45 ? "none" : "auto";
      });
    },
    [categories.length]
  );

  useEffect(() => {
    lastFrameRef.current = performance.now();
    positionCards(phaseRef.current);

    const animate = (now: number) => {
      const elapsed = Math.min(now - lastFrameRef.current, 40);
      lastFrameRef.current = now;

      const pointerIsActive = now - lastPointerMoveRef.current < 520;
      const autoplayAllowed =
        !reducedMotionRef.current &&
        !pointerIsActive &&
        !draggingRef.current &&
        !hoveredCardRef.current;
      const desiredVelocity = draggingRef.current || hoveredCardRef.current
        ? 0
        : pointerIsActive
        ? targetVelocityRef.current
        : autoplayAllowed
        ? 0.000105
        : 0;

      velocityRef.current +=
        (desiredVelocity - velocityRef.current) * Math.min(1, elapsed * 0.008);

      if (!draggingRef.current && !reducedMotionRef.current) {
        phaseRef.current = normalizePhase(
          phaseRef.current + velocityRef.current * elapsed,
          categories.length
        );
      }

      positionCards(phaseRef.current);

      const nextActive = normalizePhase(
        Math.round(phaseRef.current),
        categories.length
      );
      if (activeIndexRef.current !== nextActive) {
        activeIndexRef.current = nextActive;
        setActiveIndex(nextActive);
      }
      rafRef.current = window.requestAnimationFrame(animate);
    };

    rafRef.current = window.requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, [categories.length, positionCards]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const now = performance.now();

    if (draggingRef.current) {
      const distance = event.clientX - dragStartXRef.current;
      if (Math.abs(distance) > 8) {
        dragMovedRef.current = true;
        if (!dragCapturedRef.current) {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragCapturedRef.current = true;
        }
      }
      phaseRef.current = normalizePhase(
        dragStartPhaseRef.current - distance / 230,
        categories.length
      );
      lastPointerMoveRef.current = now;
      return;
    }

    if (lastPointerXRef.current !== null) {
      const horizontalMovement = event.clientX - lastPointerXRef.current;
      if (Math.abs(horizontalMovement) > 0.25) {
        targetVelocityRef.current = clamp(
          -horizontalMovement * 0.000075,
          -0.0012,
          0.0012
        );
        lastPointerMoveRef.current = now;
      }
    }

    lastPointerXRef.current = event.clientX;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    dragMovedRef.current = false;
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    if (event.pointerType === "mouse" && target.closest("a")) return;

    draggingRef.current = true;
    dragStartXRef.current = event.clientX;
    dragStartPhaseRef.current = phaseRef.current;
    dragPointerIdRef.current = event.pointerId;
    dragCapturedRef.current = false;
    targetVelocityRef.current = 0;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    draggingRef.current = false;
    lastPointerMoveRef.current = performance.now();
    lastPointerXRef.current = event.clientX;
    if (
      dragPointerIdRef.current === event.pointerId &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragPointerIdRef.current = null;
    dragCapturedRef.current = false;
  };

  const rotateBy = (direction: number) => {
    phaseRef.current = normalizePhase(
      Math.round(phaseRef.current) + direction,
      categories.length
    );
    const nextActive = normalizePhase(
      Math.round(phaseRef.current),
      categories.length
    );
    activeIndexRef.current = nextActive;
    setActiveIndex(nextActive);
    velocityRef.current = 0;
    targetVelocityRef.current = 0;
    lastPointerMoveRef.current = performance.now();
    positionCards(phaseRef.current);
  };

  const activeCategory = categories[activeIndex] || categories[0];
  const activeCopy = activeCategory?.[lang] || activeCategory?.ar;

  return (
    <section
      ref={stageRef}
      className="orbit-hero relative isolate h-[calc(100svh-4.5rem)] min-h-[620px] max-h-[720px] w-full touch-pan-y overflow-hidden bg-[#dff7fa] text-slate-950 md:h-[calc(100svh-5rem)] md:min-h-[640px] md:max-h-[780px]"
      dir={isAr ? "rtl" : "ltr"}
      aria-roledescription={isAr ? "عرض دائري للأقسام" : "Category orbit carousel"}
      aria-label={isAr ? "أقسام متجر سيزر" : "Cesar Store categories"}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => {
        lastPointerXRef.current = null;
        targetVelocityRef.current = 0;
        if (!dragCapturedRef.current) {
          draggingRef.current = false;
          dragPointerIdRef.current = null;
        }
      }}
    >
      <Image
        src="/slides/hero.jpg"
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="pointer-events-none absolute inset-0 z-0 select-none object-contain object-center"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 pt-16 text-center sm:px-6 md:pt-20">
        <div className="pointer-events-none max-w-3xl">
          <p className="mb-3 text-lg font-black uppercase tracking-[0.22em] text-slate-900/80 drop-shadow-[0_2px_10px_rgba(255,255,255,0.95)] md:text-2xl">
            {isAr ? "اكتشف عالم سيزر" : "Discover Cesar World"}
          </p>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-slate-950 drop-shadow-[0_3px_14px_rgba(255,255,255,0.95)] md:text-6xl lg:text-7xl">
            {isAr ? "حرّك المؤشر واكتشف ما يناسب سيارتك" : "Move, explore, and elevate your car"}
          </h1>
        </div>

        <div className="relative mt-8 h-[300px] w-full max-w-6xl [perspective:1400px] md:mt-10 md:h-[350px] lg:h-[380px]">
          {categories.map((category, index) => {
            const copy = category[lang] || category.ar;
            return (
              <Link
                key={category.id}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                href={`/shop?category=${encodeURIComponent(category.category)}`}
                prefetch={false}
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
                onPointerDown={(event) => {
                  if (event.pointerType === "mouse") {
                    dragMovedRef.current = false;
                    event.stopPropagation();
                  }
                }}
                onClick={(event) => {
                  if (dragMovedRef.current) event.preventDefault();
                }}
                onPointerEnter={() => {
                  hoveredCardRef.current = true;
                  targetVelocityRef.current = 0;
                }}
                onPointerLeave={() => {
                  hoveredCardRef.current = false;
                }}
                onFocus={() => {
                  phaseRef.current = index;
                  activeIndexRef.current = index;
                  velocityRef.current = 0;
                  setActiveIndex(index);
                  positionCards(index);
                }}
                className="orbit-category-card group absolute left-1/2 top-0 block aspect-[4/5] w-[155px] origin-bottom overflow-hidden rounded-[1.7rem] border border-white/80 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.25)] outline-none focus-visible:ring-4 focus-visible:ring-blue-500/70 sm:w-[185px] md:w-[210px] lg:w-[230px]"
                aria-label={`${copy.title}: ${copy.subtitle}`}
              >
                <Image
                  src={category.image || "/placeholder.png"}
                  alt={copy.title}
                  fill
                  priority={index < 3}
                  sizes="(max-width: 640px) 155px, (max-width: 1024px) 210px, 230px"
                  className="select-none object-cover transition-transform duration-500 group-hover:scale-105"
                  draggable={false}
                />
                <div className="absolute inset-x-0 bottom-0 bg-slate-950/78 p-4 text-start text-white backdrop-blur-sm">
                  <p className="text-base font-black md:text-lg">{copy.title}</p>
                  <p className="mt-1 line-clamp-1 text-[11px] font-bold text-white/75 md:text-xs">
                    {copy.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-5 z-30 mx-auto flex max-w-4xl items-center justify-center gap-3 rounded-[2rem] border border-white bg-white/95 px-5 py-4 shadow-[0_22px_70px_rgba(15,23,42,0.18)] md:bottom-7">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => rotateBy(isAr ? 1 : -1)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          aria-label={isAr ? "القسم السابق" : "Previous category"}
        >
          {isAr ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xl font-black text-slate-950 md:text-3xl">
            {activeCopy?.title}
          </p>
          <p className="mx-auto mt-1 line-clamp-1 max-w-xl text-xs font-bold text-slate-500 md:text-sm">
            {activeCopy?.subtitle}
          </p>
          {activeCategory ? (
            <Link
              href={`/shop?category=${encodeURIComponent(activeCategory.category)}`}
              prefetch={false}
              onPointerDown={(event) => event.stopPropagation()}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-xl transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            >
              {isAr ? "استكشف القسم" : "Explore category"}
              {isAr ? <ArrowLeft size={17} /> : <ArrowRight size={17} />}
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => rotateBy(isAr ? -1 : 1)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          aria-label={isAr ? "القسم التالي" : "Next category"}
        >
          {isAr ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
        </button>
      </div>
    </section>
  );
}
