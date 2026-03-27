"use client";
import "./footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-inner">

          {/* ── LEFT: Copyright ───────────────────── */}
          <div className="footer-left">
            <span className="footer-copy">
              © {new Date().getFullYear()} EasyRecall. All rights reserved.
            </span>
            {/* <span className="footer-dot">•</span> */}
            {/* <span className="footer-region">
              Made in Europe <span className="footer-eu">EU</span>
            </span> */}
          </div>

          {/* ── RIGHT: Contact ────────────────────── */}
          <div className="footer-right">
            <a href="mailto:contact@easyrecall.app" className="footer-email">
              <svg
                className="footer-email-icon"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              contact@easyrecall.app
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
