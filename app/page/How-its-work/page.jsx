"use client";
import React from "react";
import "./howitworks.css";
import {
  Upload,
  FileText,
  LayoutGrid,
  HelpCircle,
  SlidersHorizontal,
  Repeat,
  BarChart3
} from "lucide-react";

const HowItWorks = () => {
  return (
    <section className="how">
      <div className="how-header">
        <h2>How EasyRecall Works</h2>
        <p>
          Transform your study materials into interactive quizzes and flashcards in three simple steps.
        </p>
      </div>

      <div className="steps">

        {/* Step 1 */}
        <div className="step">
          <div className="step-top">
            <div className="step-number">1</div>
            <div className="line"></div>
          </div>

          <h3>Upload Your Materials</h3>
          <p>Simply upload your study materials and let our AI do the work.</p>

          <ul>
            <li><Upload size={16} /> Easy drag & drop upload</li>
            <li><FileText size={16} /> Supports PDF documents</li>
          </ul>
        </div>

        {/* Step 2 */}
        <div className="step">
          <div className="step-top">
            <div className="step-number">2</div>
            <div className="line"></div>
          </div>

          <h3>AI Creates Study Materials</h3>
          <p>
         Transform your study materials into interactive quizzes and flashcards in three <br/> simple steps.
          </p>

          <ul>
            <li><LayoutGrid size={16} /> Smart flashcard generation</li>
            <li><HelpCircle size={16} /> Custom quiz questions</li>
            <li><SlidersHorizontal size={16} /> Adjustable difficulty levels</li>
          </ul>
        </div>

        {/* Step 3 */}
        <div className="step">
          <div className="step-top">
            <div className="step-number">3</div>
            <div className="line"></div>
          </div>

          <h3>Master Your Studies</h3>
          <p>
            Learn effectively with multiple study methods and track your progress.
          </p>

          <ul>
            <li><LayoutGrid size={16} /> Interactive quizzes</li>
            <li><Repeat size={16} /> Spaced repetition flashcards</li>
            <li><BarChart3 size={16} /> Progress tracking</li>
          </ul>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
