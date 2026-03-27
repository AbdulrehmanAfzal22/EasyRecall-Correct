import React from "react";
import "./feature.css";
import {
  FileText,
  Sparkles,
  LayoutGrid,
  BarChart3,
  Languages,
  CheckCircle,
  History,
  TrendingUp,
  Globe,
  ScanLine,
  Repeat
} from "lucide-react";

const FeaturesSection = () => {
  return (
    <section className="features">
       <div className="heading">
        <h1 className="heading-h1">Everything You Need to Study Smarter</h1>
        <p className="heading-paragraph">Powerful features designed to transform your study materials into an effective,<br /> interactive learning experience with EasyRecall.</p>
        </div>
      <div className="features-container">

        {/* 1 */}
        <div className="feature-card">
          <div className="icon-box">
            <FileText size={26} />
          </div>
          <h3>Easy Document Upload</h3>
          <p>
            Upload PDFs, notes, and study materials with a simple drag and drop interface.
          </p>
          <ul>
            <li><FileText size={16} /> Support for PDF documents</li>
            <li><Repeat size={16} /> Drag & drop functionality</li>
          </ul>
        </div>

        {/* 2 */}
        <div className="feature-card">
          <div className="icon-box">
            <Sparkles size={26} />
          </div>
          <h3>AI-Powered Quizzes</h3>
          <p>
            Generate intelligent questions that test your understanding at your preferred difficulty level.
          </p>
          <ul>
            <li><Sparkles size={16} /> Smart question generation</li>
            <li><CheckCircle size={16} /> Multiple choice format</li>
            <li><TrendingUp size={16} /> Adjustable difficulty</li>
          </ul>
        </div>

        {/* 3 */}
        <div className="feature-card">
          <div className="icon-box">
            <LayoutGrid size={26} />
          </div>
          <h3>Smart Flashcards</h3>
          <p>
            Create AI-generated flashcards for effective memorization and quick review sessions.
          </p>
          <ul>
            <li><LayoutGrid size={16} /> AI-powered card generation</li>
            <li><Repeat size={16} /> Shuffle and review modes</li>
            <li><TrendingUp size={16} /> Spaced repetition learning</li>
          </ul>
        </div>

        {/* 4 */}
        <div className="feature-card">
          <div className="icon-box">
            <BarChart3 size={26} />
          </div>
          <h3>Progress Tracking</h3>
          <p>
            Monitor your learning journey across quizzes and flashcards with detailed analytics.
          </p>
          <ul>
            <li><BarChart3 size={16} /> Performance analytics</li>
            <li><History size={16} /> Study history tracking</li>
            <li><TrendingUp size={16} /> Learning insights</li>
          </ul>
        </div>

        {/* 5 */}
        <div className="feature-card">
          <div className="icon-box">
            <Languages size={26} />
          </div>
          <h3>Multi-Language Support</h3>
          <p>
            Study in your native language with support for 20+ languages including Spanish, French, Arabic, and more.
          </p>
          <ul>
            <li><Globe size={16} /> 20+ languages supported</li>
            <li><ScanLine size={16} /> Auto-language detection</li>
            <li><Languages size={16} /> Translation mode available</li>
          </ul>
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;
