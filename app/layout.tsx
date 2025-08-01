/**
 * @fileoverview Root Layout Component - Application-wide layout and configuration
 * 
 * This file defines the root layout for the Smart Biodigester monitoring application.
 * It establishes the base HTML structure, font configuration, metadata, and global
 * styling that applies to all pages in the application.
 * 
 * Key Features:
 * - Modern font stack with Geist Sans and Geist Mono
 * - SEO-optimized metadata configuration
 * - Global CSS imports and styling
 * - Accessibility-friendly HTML structure
 * - Font variable CSS custom properties
 * 
 * @author Tim Siebert & Max Zboralski
 * @version 1.0.0
 * @since 2025-08-31
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Primary sans-serif font configuration using Geist font family.
 * 
 * Geist is a modern, highly legible typeface optimized for digital interfaces.
 * The font is configured with CSS custom properties for flexible usage
 * throughout the application via Tailwind CSS font utilities.
 * 
 * @constant geistSans
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Monospace font configuration using Geist Mono font family.
 * 
 * Geist Mono provides excellent readability for code, sensor data,
 * and other technical content that requires fixed-width characters.
 * Used primarily for displaying sensor values and raw data output.
 * 
 * @constant geistMono
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Application metadata configuration for SEO and browser optimization.
 * 
 * Defines the application title, description, and other metadata that appears
 * in browser tabs, search engine results, and social media previews.
 * The description includes key functionality to improve search discoverability.
 * 
 * @constant metadata
 */
export const metadata: Metadata = {
  title: "Smart Biodigester Monitor",
  description: "Real-time monitoring system for smart biodigester sensor data including pH, temperature, humidity, pressure, and methane measurements with alarm notifications.",
};

/**
 * Root layout component that wraps all pages in the application.
 * 
 * This component establishes the fundamental HTML structure and applies
 * global styling and font configurations. It serves as the foundation
 * for all pages in the Smart Biodigester monitoring system.
 * 
 * Features:
 * - Sets HTML language attribute for accessibility
 * - Applies font CSS custom properties to body element
 * - Enables font antialiasing for improved text rendering
 * - Provides consistent layout structure across all pages
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components/pages to render
 * @returns {JSX.Element} The root HTML structure with applied styling
 * 
 * @example
 * ```tsx
 * // This layout automatically wraps all pages:
 * <RootLayout>
 *   <HomePage /> // or any other page component
 * </RootLayout>
 * ```
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
