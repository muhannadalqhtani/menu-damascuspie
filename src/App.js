// src/App.js
import React, { useMemo, useEffect, useState } from "react";
import "./App.css";

import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

// صورة بانر افتراضي
const DEFAULT_BANNER = "/images/banners/banner.png";

// دالة بسيطة تضمن إن المسار شغال للصور العادية
const toSrc = (path) => {
  if (!path) return "";
  // لو الصورة أصلاً base64 (data:image/...)
  if (path.startsWith("data:image")) return path;
  // لو صورة داخل public
  return path.startsWith("/") ? path : `/${path}`;
};

export default function App() {
  // الأقسام القادمة من Firestore
  const [categories, setCategories] = useState([]);
  // صور مكسورة (نستعملها بس للصور اللي مو base64)
  const [missing, setMissing] = useState(new Set());
  // المنتج المفتوح في المودال
  const [active, setActive] = useState(null);

  // تحميل الأقسام + المنتجات من Firestore
  useEffect(() => {
    (async () => {
      try {
        const catsQ = query(
          collection(db, "menuCategories"),
          orderBy("order", "asc")
        );
        const catsSnap = await getDocs(catsQ);

        const list = [];
        for (const c of catsSnap.docs) {
          const catData = {
            id: c.id,
            ...c.data(),
            items: [],
          };

          // اقرأ المنتجات داخل القسم
          const itemsSnap = await getDocs(
            collection(db, "menuCategories", c.id, "items")
          );

          catData.items = itemsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          list.push(catData);
        }

        setCategories(list);
      } catch (err) {
        console.error("Firestore load error:", err);
        setCategories([]); // فاضي مؤقتاً
      }
    })();
  }, []);

  // الروابط حق التنقل العلوي
  const navLinks = useMemo(
    () => categories.map((c) => ({ id: c.id, title: c.title })),
    [categories]
  );

  // فتح وغلق المودال
  const openProduct = (p) => setActive(p);
  const closeProduct = () => setActive(null);

  // فحص الصور (بس للصور الملفّية، مش base64)
  useEffect(() => {
    if (!categories.length) return;
    let canceled = false;

    async function checkImages() {
      const urls = categories.flatMap((c) =>
        c.items
          .map((i) => i.img)
          .filter(Boolean)
          // استبعد base64
          .filter((u) => !u.startsWith("data:image"))
      );

      const unique = Array.from(new Set(urls));
      const bad = new Set();

      await Promise.all(
        unique.map(async (u) => {
          try {
            const url = toSrc(u);
            const res = await fetch(url, { method: "HEAD" });
            if (!res.ok) bad.add(url);
          } catch (_) {
            bad.add(u);
          }
        })
      );

      if (!canceled) setMissing(bad);
    }

    checkImages();
    return () => {
      canceled = true;
    };
  }, [categories]);

  return (
    <div dir="rtl" className="page">
      {/* ===== Header ===== */}
      <header className="topbar">
        <div className="container header-content">
          <div className="logo-title">
            <img
              src="/images/logo.png"
              alt="شعار الفطيرة الدمشقية"
              className="logo"
              onError={(e)=>{ e.currentTarget.style.visibility="hidden"; }}
            />
            <div>
              <h1 className="brand">الفطيرة الدِّمشقيّة</h1>
              <div className="sub">منيو — عرض الأقسام والمنتجات فقط</div>
            </div>
          </div>
        </div>

        {/* شريط الأقسام */}
        <nav className="nav">
          <div className="container nav-scroll hide-scrollbar">
            <ul className="nav-list">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <a href={`#${link.id}`} className="pill">
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/* ===== المحتوى ===== */}
      <main className="container main">
        {categories.map((cat, index) => (
          <React.Fragment key={cat.id || cat.title}>
            {/* بانر أعلى القسم (bannerTop) */}
            {cat.bannerTop && (
              <div className="divider-wrap">
                <img
                  className="section-banner section-banner--top"
                  src={toSrc(cat.bannerTop)}
                  alt={`بانر قسم ${cat.title}`}
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fallback) return;
                    e.currentTarget.dataset.fallback = "1";
                    e.currentTarget.src = DEFAULT_BANNER;
                  }}
                />
              </div>
            )}

            <section id={cat.id} className="section">
              <div className="section-head">
                <h2 className="section-title">{cat.title}</h2>
              </div>

              <div className="grid">
                {cat.items.map((p) => {
                  const imgSrc = toSrc(p.img);
                  const isMissing =
                    imgSrc &&
                    !imgSrc.startsWith("data:image") &&
                    missing.has(imgSrc);

                  return (
                    <article
                      key={p.id || p.name}
                      className="card"
                      onClick={() => openProduct(p)}
                      tabIndex={0}
                      role="button"
                      aria-label={`عرض تفاصيل ${p.name}`}
                    >
                      <div className="thumb">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={p.name}
                            loading="lazy"
                            style={{ objectFit: "contain" }}
                            onError={(e) => {
                              if (e.currentTarget.dataset.fallback) return;
                              e.currentTarget.dataset.fallback = "1";
                              e.currentTarget.src = "/images/placeholder.png";
                            }}
                          />
                        ) : (
                          <img
                            src="/images/placeholder.png"
                            alt="no img"
                            loading="lazy"
                            style={{ objectFit: "contain" }}
                          />
                        )}
                      </div>

                      <div className="info">
                        <h3 className="title">{p.name}</h3>

                        <div className="price">
                          {p.price}
                          <span className="currency"> ر.س</span>
                        </div>

                        {/* السعرات لو موجودة */}
                        {typeof p.calories !== "undefined" &&
                          p.calories !== null &&
                          p.calories !== "" && (
                            <div
                              className="cal-badge"
                              style={{
                                fontSize: "0.8rem",
                                color: "#006644",
                                marginTop: "0.25rem",
                              }}
                            >
                              🔥 {p.calories} سعرة
                            </div>
                          )}

                        {/* التحذير للصورة فقط لو فعلاً فشل ملف خارجي */}
                        {isMissing && (
                          <div className="missing">
                            ⚠︎ الصورة غير موجودة
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* بانر بعد القسم (bannerAfter)، بس لو مو آخر واحد */}
            {index < categories.length - 1 && cat.bannerAfter && (
              <div className="divider-wrap">
                <img
                  className="section-banner"
                  src={toSrc(cat.bannerAfter) || DEFAULT_BANNER}
                  alt={`فاصل قسم ${cat.title}`}
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fallback) return;
                    e.currentTarget.dataset.fallback = "1";
                    e.currentTarget.src = DEFAULT_BANNER;
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}

        <footer className="footer">
          © {new Date().getFullYear()} الفطيرة الدمشقية — منيو ويب
        </footer>

        {/* نافذة التفاصيل */}
        {active && (
          <div className="modal-backdrop" onClick={closeProduct}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <button
                  className="modal-close"
                  onClick={closeProduct}
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="modal-media">
                  <img
                    src={toSrc(active.img)}
                    alt={active.name}
                    onError={(e) => {
                      if (e.currentTarget.dataset.fallback) return;
                      e.currentTarget.dataset.fallback = "1";
                      e.currentTarget.src = "/images/placeholder.png";
                    }}
                    style={{ objectFit: "contain" }}
                  />
                </div>

                <div className="modal-info">
                  <h3 className="modal-title">{active.name}</h3>

                  <div className="modal-price">
                    {active.price}
                    <span className="currency"> ر.س</span>
                  </div>

                  <div className="meta-row">
                    {typeof active.calories !== "undefined" &&
                      active.calories !== "" && (
                        <span className="badge">
                          🔥 {active.calories} سعرة
                        </span>
                      )}
                  </div>

                  {active.desc && (
                    <p className="modal-desc">{active.desc}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
