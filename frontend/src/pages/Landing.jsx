import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Landing() {
  const navigate = useNavigate();
  const { isAuth } = useAuth();

  const handleStart = () => {
    if (isAuth) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="landing-container">
      {/* Top Navbar */}
      <header className="landing-header">
        <div className="landing-logo">
          <div className="logo-icon">N</div>
          <div className="logo-text heading-font">Note<span>Hub</span></div>
        </div>
        <div className="landing-nav-actions">
          {isAuth ? (
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
          ) : (
            <>
              <button className="btn-secondary" style={{ marginRight: 12 }} onClick={() => navigate('/login')}>Sign In</button>
              <button className="btn-primary" onClick={() => navigate('/register')}>Sign Up Free</button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-badge">✨ AI-Powered Note & Knowledge Base</div>
        <h1 className="hero-title heading-font">Your knowledge, organized by AI.</h1>
        <p className="hero-subtitle">
          Capture your thoughts, understand your notes instantly, and ask AI questions about everything you've learned.
        </p>
        <div className="hero-ctas">
          <button className="btn-primary hero-btn-lg" onClick={handleStart}>
            Start Taking Notes →
          </button>
          <button className="btn-secondary hero-btn-lg" onClick={() => navigate(isAuth ? '/dashboard' : '/login')}>
            Explore AI Assistant
          </button>
        </div>
      </section>

      {/* Pipeline / How it works */}
      <section className="landing-pipeline">
        <h2 className="section-title heading-font">The NoteMind Pipeline</h2>
        <div className="pipeline-flow">
          <div className="pipeline-step">
            <div className="step-num">1</div>
            <div className="step-label">Write</div>
            <p className="step-desc">Capture raw thoughts, class lectures, or project specifications.</p>
          </div>
          <div className="pipeline-arrow">➔</div>
          <div className="pipeline-step">
            <div className="step-num">2</div>
            <div className="step-label">Understand</div>
            <p className="step-desc">AI automatically preprocesses, chunks, and summarizes content.</p>
          </div>
          <div className="pipeline-arrow">➔</div>
          <div className="pipeline-step">
            <div className="step-num">3</div>
            <div className="step-label">Organize</div>
            <p className="step-desc">AI tags and categorizes, storing context as semantic vector embeddings.</p>
          </div>
          <div className="pipeline-arrow">➔</div>
          <div className="pipeline-step">
            <div className="step-num">4</div>
            <div className="step-label">Ask</div>
            <p className="step-desc">Chat with your notes and ask the agent questions across all documents.</p>
          </div>
          <div className="pipeline-arrow">➔</div>
          <div className="pipeline-step">
            <div className="step-num">5</div>
            <div className="step-label">Discover</div>
            <p className="step-desc">Retrieve grounded answers, checklists, and deep connection insights.</p>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="landing-problem-solution">
        <div className="side-card problem">
          <h3 className="card-heading-red">The Problem ❌</h3>
          <p>
            Traditional note applications store words but provide zero intelligence. As your collection grows, search becomes useless, and critical details get buried in a digital graveyard.
          </p>
        </div>
        <div className="side-card solution">
          <h3 className="card-heading-green">The Solution ✅</h3>
          <p>
            NoteHub transforms notes from static text into an interactive, semantic knowledge graph. Using Retrieval-Augmented Generation (RAG) and smart agents, it reads and connects information for you.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="landing-features">
        <h2 className="section-title heading-font">Core Features</h2>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">📝</div>
            <h4>Smart Notes</h4>
            <p>Write with dynamic headings, categories, and tags. Edit note content seamlessly.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">⚡</div>
            <h4>AI Summaries</h4>
            <p>Condense lengthy research, papers, or articles into bite-sized actionable bullet points in seconds.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔍</div>
            <h4>Semantic Search</h4>
            <p>Find notes based on concepts and meaning (e.g. searching 'database setup' retrieves note containing 'docker run postgres').</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💬</div>
            <h4>Chat With Your Notes</h4>
            <p>Ask questions grounded directly inside a single note to extract quotes or summarize specific paragraphs.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🏷️</div>
            <h4>AI Organization</h4>
            <p>AI suggests tags and categories automatically based on deep reading of your note drafts.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">✅</div>
            <h4>Action Item Checklists</h4>
            <p>Automatically extract task checklists from notes to keep your project deliverables organized.</p>
          </div>
        </div>
      </section>

      {/* Footer & Portfolio branding */}
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} NoteHub. All rights reserved.</p>
        <p className="footer-portfolio">
          Designed and Developed by{' '}
          <a href="https://github.com/hadiakhan" target="_blank" rel="noopener noreferrer">
            Hadia Khan
          </a>{' '}
          as a Capstone Project.
        </p>
      </footer>
    </div>
  );
}

export default Landing;
