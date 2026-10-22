"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import {
  revealVariants,
  staggerContainerVariants,
  type RevealDirection,
} from "./variants";

const CONTAINERS = {
  div: motion.div,
  ul: motion.ul,
  ol: motion.ol,
  section: motion.section,
};
const ITEMS = { div: motion.div, li: motion.li };

type StaggerProps = {
  children: ReactNode;
  as?: keyof typeof CONTAINERS;
  /** Seconds between consecutive children. */
  step?: number;
  /** Seconds before the first child starts once in view. */
  delay?: number;
  amount?: number;
  className?: string;
};

/**
 * Reveals its `StaggerItem` children one after another when the group
 * scrolls into view (card grids, the bento discovery grid). Under reduced
 * motion every item fades in together.
 */
export function Stagger({
  children,
  as = "div",
  step,
  delay,
  amount = 0.15,
  className,
}: StaggerProps) {
  const reduced = usePrefersReducedMotion();
  const Container = CONTAINERS[as];
  return (
    <Container
      className={className}
      variants={staggerContainerVariants(reduced, step, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </Container>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  as?: keyof typeof ITEMS;
  direction?: RevealDirection;
  className?: string;
};

/** One child of a `Stagger`; inherits the parent's in-view trigger and timing. */
export function StaggerItem({
  children,
  as = "div",
  direction = "up",
  className,
}: StaggerItemProps) {
  const reduced = usePrefersReducedMotion();
  const Item = ITEMS[as];
  return (
    <Item className={className} variants={revealVariants(direction, reduced)}>
      {children}
    </Item>
  );
}
