"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  RiText,
  RiSunLine,
  RiMoonLine,
  RiSearchLine,
  RiArrowUpLine,
  RiEyeLine,
  RiEyeOffLine,
  RiBookOpenLine,
  RiMenuLine,
} from "@remixicon/react";

interface ReaderClientProps {
  htmlContent: string;
  leiTitle: string;
  leiUrl: string;
}

export default function ReaderClient({
  htmlContent,
  leiTitle,
  leiUrl,
}: ReaderClientProps) {
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg" | "xl">("md");
  const [fontFamily, setFontFamily] = useState<"serif" | "sans">("serif");
  const [theme, setTheme] = useState<"light" | "dark" | "sepia">("light");
  const [hideRevogados, setHideRevogados] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [articles, setArticles] = useState<{ id: string; text: string }[]>([]);
  const [showIndex, setShowIndex] = useState<boolean>(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Handle scroll progress and show scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      }
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Parse HTML to extract article list for table of contents
  useEffect(() => {
    if (!contentRef.current) return;

    // Search for articles in the rendered HTML
    const articleAnchors = contentRef.current.querySelectorAll("a[name]");
    const articleList: { id: string; text: string }[] = [];

    articleAnchors.forEach((anchor) => {
      const name = anchor.getAttribute("name");
      if (name && (name.startsWith("art") || name.startsWith("c"))) {
        // Try to find the text of the article
        const parent = anchor.parentElement;
        let text = "";
        if (parent) {
          text = parent.textContent || "";
        }
        
        // Clean text to show in the list (e.g. "Art. 1º", "Art. 121")
        const match = text.match(/(Art\.\s*\d+[^.-]*)/i);
        if (match && match[1]) {
          articleList.push({
            id: name,
            text: match[1].trim(),
          });
        }
      }
    });

    // Deduplicate and filter list
    const seen = new Set<string>();
    const uniqueList = articleList.filter((item) => {
      const key = (item.text || "").toLowerCase();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setArticles(uniqueList);
  }, [htmlContent]);

  const scrollToAnchor = (id: string) => {
    const element = document.getElementsByName(id)[0];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setShowIndex(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Build fontSize style classes
  const fontSizes = {
    sm: "text-[15px] leading-7",
    md: "text-[17px] leading-8",
    lg: "text-[20px] leading-9",
    xl: "text-[23px] leading-10",
  };

  // Themes stylesheets mapping
  const themeClasses = {
    light: "bg-white text-neutral-900 selection:bg-blue-100",
    dark: "bg-neutral-950 text-neutral-100 selection:bg-neutral-800",
    sepia: "bg-[#fcf8f2] text-[#433422] selection:bg-[#ecdcc6]",
  };

  // Filter content client-side using highlighting
  const getRenderedHtml = () => {
    if (!searchQuery.trim()) return htmlContent;

    // Basic highlighting function: wraps query matches in <mark> tags
    // Safe implementation that avoids breaking HTML tags
    try {
      const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      
      // We only want to highlight inside text nodes, but since we receive HTML, we can parse/replace safely.
      // For simplicity, a simple regex on non-HTML tags could work, but standard replacement might corrupt attributes.
      // To be safe, we can do a simple replacement of the text nodes' content or use a simplified replacement:
      // Since this is a reader, let's use a browser-native text search or a safe replacement:
      // Let's replace only text outside HTML tags.
      return htmlContent.replace(/(<[^>]+>|[^<]+)/g, (match) => {
        if (match.startsWith("<")) return match; // Keep tags intact
        return match.replace(regex, `<mark class="bg-yellow-300 dark:bg-yellow-800 text-neutral-950 px-0.5 rounded-sm">$1</mark>`);
      });
    } catch {
      return htmlContent;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses[theme]}`}>
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-50 bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-100"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Floating Toolbar */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-md bg-white/80 dark:bg-neutral-950/80 transition-colors duration-300 px-6 py-4">
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RiBookOpenLine className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            <div>
              <h1 className="text-lg font-bold tracking-tight line-clamp-1">{leiTitle}</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Fonte: <a href={leiUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Planalto Oficial</a>
              </p>
            </div>
          </div>

          {/* Reader Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Index / Table of Contents Toggle */}
            {articles.length > 0 && (
              <button
                onClick={() => setShowIndex(!showIndex)}
                className={`p-2 rounded-lg border transition-all ${
                  showIndex
                    ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400"
                    : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }`}
                title="Índice da Lei"
              >
                <RiMenuLine className="w-5 h-5" />
              </button>
            )}

            {/* Search Input */}
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar na lei..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-40 sm:w-52 text-sm rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Revogados Toggle */}
            <button
              onClick={() => setHideRevogados(!hideRevogados)}
              className={`p-2 rounded-lg border transition-all ${
                hideRevogados
                  ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-900 dark:text-red-400"
                  : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              }`}
              title={hideRevogados ? "Mostrar artigos revogados" : "Ocultar artigos revogados"}
            >
              {hideRevogados ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
            </button>

            {/* Font Family Toggle */}
            <button
              onClick={() => setFontFamily(fontFamily === "serif" ? "sans" : "serif")}
              className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              title="Mudar fonte"
            >
              <RiText className="w-5 h-5" />
            </button>

            {/* Font Size Selector */}
            <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  if (fontSize === "xl") setFontSize("lg");
                  else if (fontSize === "lg") setFontSize("md");
                  else if (fontSize === "md") setFontSize("sm");
                }}
                disabled={fontSize === "sm"}
                className="px-3 py-2 text-xs font-bold hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-40"
              >
                A-
              </button>
              <div className="px-2 py-2 text-xs font-medium border-x border-neutral-200 dark:border-neutral-800">
                {fontSize.toUpperCase()}
              </div>
              <button
                onClick={() => {
                  if (fontSize === "sm") setFontSize("md");
                  else if (fontSize === "md") setFontSize("lg");
                  else if (fontSize === "lg") setFontSize("xl");
                }}
                disabled={fontSize === "xl"}
                className="px-3 py-2 text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-900 disabled:opacity-40"
              >
                A+
              </button>
            </div>

            {/* Theme Selector */}
            <div className="flex border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setTheme("light")}
                className={`p-2 ${theme === "light" ? "bg-neutral-100 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-900"}`}
                title="Tema Claro"
              >
                <RiSunLine className="w-4 h-4 text-orange-500" />
              </button>
              <button
                onClick={() => setTheme("sepia")}
                className={`p-2 px-3 text-xs font-bold ${theme === "sepia" ? "bg-[#ecdcc6] text-[#433422]" : "hover:bg-neutral-50 dark:hover:bg-neutral-900 text-amber-700"}`}
                title="Tema Sépia"
              >
                S
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-2 ${theme === "dark" ? "bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-900"}`}
                title="Tema Escuro"
              >
                <RiMoonLine className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-[1000px] mx-auto px-6 py-10 flex gap-8 relative">
        
        {/* Sidebar Index / TOC */}
        {showIndex && articles.length > 0 && (
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-6 overflow-y-auto shadow-2xl transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-md font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Sumário da Lei</h2>
              <button
                onClick={() => setShowIndex(false)}
                className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Fechar
              </button>
            </div>
            <ul className="space-y-1.5 text-sm">
              {articles.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => scrollToAnchor(item.id)}
                    className="w-full text-left py-1.5 px-3 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 transition-colors line-clamp-1"
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Backdrop for Sidebar */}
        {showIndex && (
          <div
            onClick={() => setShowIndex(false)}
            className="fixed inset-0 z-40 bg-neutral-950/20 backdrop-blur-xs"
          />
        )}

        {/* Law Text Container */}
        <main className="flex-1 max-w-[800px] mx-auto">
          <article
            ref={contentRef}
            className={`letra-da-lei ${fontSizes[fontSize]} ${
              fontFamily === "serif" ? "font-serif" : "font-sans"
            } ${hideRevogados ? "hide-revogados" : ""}`}
            dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
          />
        </main>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg z-50 hover:scale-105 active:scale-95 transition-all"
          title="Voltar ao Topo"
        >
          <RiArrowUpLine className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
