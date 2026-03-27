"use client";

import { useState } from "react";
import { Clock, Monitor, CreditCard, Settings } from "lucide-react";
import "./faq.css";

const faqData = {
  "Getting Started": [
    {
      question: "How does EasyRecall work?",
      answer:
        "EasyRecall uses AI to transform your study materials into interactive flashcards, quizzes, and summaries. Simply upload your notes or textbooks, and our system automatically generates personalized study content tailored to your learning style.",
    },
    {
      question: "How much does EasyRecall cost?",
      answer:
        "EasyRecall offers a free plan with basic features including up to 50 flashcard sets per month. Our Pro plan starts at $9.99/month and includes unlimited flashcards, AI-powered quizzes, and priority support.",
    },
    {
      question: "What file formats are supported?",
      answer:
        "EasyRecall supports PDF, DOCX, TXT, PPTX, and image files (JPG, PNG).",
     },
    {
      question: "Do I need to create an account to get started?",
      answer:
        "You can explore EasyRecall with a guest session, but creating a free account lets you save your progress, sync across devices, and access all free-tier features without limitations.",
    },
    {
      question: "Is EasyRecall available on mobile?",
      answer:
        "Yes! EasyRecall is available as a web app optimized for mobile browsers, and we have native iOS and Android apps available on the App Store and Google Play.",
    },
  ],
  "Features & Usage": [
    {
      question: "How do I create flashcards from my notes?",
      answer:
        "Upload your notes through the dashboard, select 'Generate Flashcards', and our AI will automatically extract key concepts and create study-ready cards within seconds.",
    },
    {
      question: "Can I share my study sets with others?",
      answer:
        "Absolutely! You can share any study set via a public link, invite specific users by email, or publish it to our community library for other students to discover.",
    },
    {
      question: "How does the spaced repetition system work?",
      answer:
        "Our spaced repetition algorithm tracks how well you know each card and schedules reviews at optimal intervals — showing harder cards more frequently and easier ones less often to maximize retention.",
    },
    {
      question: "Can I customize the flashcards after they're generated?",
      answer:
        "Yes, every generated card can be fully edited. You can modify questions, answers, add images, format text, and reorder cards within any set.",
    },
    {
      question: "What languages does EasyRecall support?",
      answer:
        "EasyRecall supports over 40 languages for content generation and interface display, including English, Spanish, French, German, Japanese, Mandarin, and Arabic.",
    },
  ],
  "Account & Billing": [
    {
      question: "How do I upgrade to Pro?",
      answer:
        "Go to Settings → Billing and select the Pro plan. We accept all major credit cards, PayPal, and Apple Pay. Upgrades take effect immediately.",
    },
    {
      question: "Can I cancel my subscription at any time?",
      answer:
        "Yes, you can cancel at any time from your account settings. You'll continue to have access to Pro features until the end of your current billing period.",
    },
    {
      question: "Do you offer student discounts?",
      answer:
        "We offer a 50% discount for students with a verified .edu email address. Apply through the billing page and the discount will be applied automatically.",
    },
    {
      question: "What happens to my data if I downgrade?",
      answer:
        "Your data is never deleted when you downgrade. You'll retain access to all previously created content, but new creation will be limited to the free-tier quotas.",
    },
    {
      question: "Is there a team or institutional plan?",
      answer:
        "Yes! Our Teams plan supports up to 50 users with centralized billing and admin controls. Contact us at teams@EasyRecall.io for enterprise pricing.",
    },
  ],
  "Technical Questions": [
    {
      question: "Is my data secure?",
      answer:
        "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are SOC 2 Type II certified and fully GDPR compliant. Your files are never used to train our AI models.",
    },
    {
      question: "What browsers are supported?",
      answer:
        "EasyRecall works best on the latest versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience.",
    },
    {
      question: "Why is my file taking long to process?",
      answer:
        "Large files (over 50MB) or complex documents with many images may take 1–3 minutes to process. If it takes longer, try splitting the file into smaller sections or contact support.",
    },
    {
      question: "Can I use EasyRecall offline?",
      answer:
        "The EasyRecall mobile apps support offline mode for reviewing existing flashcard sets. Uploading new content and AI generation require an internet connection.",
    },
    {
      question: "How do I export my flashcards?",
      answer:
        "You can export any study set as PDF, CSV (compatible with Anki), or plain text from the set menu. Pro users can also export to formatted Word documents.",
    },
  ],
};

const categoryIcons = {
  "Getting Started": <Clock size={18} />,
  "Features & Usage": <Monitor size={18} />,
  "Account & Billing": <CreditCard size={18} />,
  "Technical Questions": <Settings size={18} />,
};

export default function FAQ() {
  const categories = Object.keys(faqData);
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [openIndex, setOpenIndex] = useState(null);

  const toggleQuestion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setOpenIndex(null);
  };

  return (
    <div className="faq-section">
      {/* Header */}
      <div className="faq-header">
        <div className="faq-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Help Center
        </div>
        <h1 className="faq-title">Frequently Asked Questions</h1>
        <p className="faq-subtitle">
          Find answers to common questions about EasyRecall and how it can help you study smarter
        </p>
      </div>

      {/* Body */}
      <div className="faq-body">
        {/* Sidebar */}
        <aside className="faq-sidebar">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`faq-sidebar-btn ${activeCategory === cat ? "active" : ""}`}
              onClick={() => handleCategoryChange(cat)}
            >
              <span className="sidebar-icon">{categoryIcons[cat]}</span>
              {cat}
            </button>
          ))}
        </aside>

        {/* Questions */}
        <div className="faq-questions">
          {faqData[activeCategory].map((item, idx) => (
            <div key={idx} className={`faq-item ${openIndex === idx ? "open" : ""}`}>
              <button
                className="faq-question"
                onClick={() => toggleQuestion(idx)}
                aria-expanded={openIndex === idx}
              >
                <span>{item.question}</span>
                <span className="faq-chevron">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>
              <div className="faq-answer">
                <div className="faq-answer-inner">{item.answer}</div>
              </div>
              <div className="faq-divider" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Still have questions? ── */}
      <div className="faq-contact">
        <div className="faq-contact-inner">
          <h2 className="faq-contact-title">Still have questions?</h2>
          <p className="faq-contact-text">
            Can't find the answer you're looking for? Please contact our support team.
          </p>
          <a href="/contact" className="faq-contact-btn">
            Contact Support
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}