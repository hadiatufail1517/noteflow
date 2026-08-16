import React, { useState, useEffect, useRef, useMemo } from 'react';
import { aiAPI } from '../services/api';
import NoteDetailModal from '../components/NoteDetailModal';

function KnowledgeGraph() {
  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Controls
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [threshold, setThreshold] = useState(0.45); // similarity threshold
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Detail Modal
  const [viewingNoteId, setViewingNoteId] = useState(null);

  // Canvas Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Simulation State
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  
  // Transform (Zoom/Pan) State
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  
  // Mouse interaction state
  const dragNodeRef = useRef(null);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0 });
  const hoverNodeRef = useRef(null);

  // Category Color Map
  const CATEGORY_COLORS = {
    'General': '#b338ff', // Purple
    'Personal': '#14b8a6', // Teal
    'Work': '#00f0ff', // Cyan
    'Study': '#ec4899', // Pink
    'Finance': '#eab308', // Yellow
    'Ideas': '#ef4444', // Red
  };

  const getNodeColor = (cat) => {
    const cleanCat = cat ? cat.trim() : 'General';
    return CATEGORY_COLORS[cleanCat] || '#a855f7';
  };

  // Fetch graph data from backend
  const fetchGraphData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch semantic graph data with threshold
      const res = await aiAPI.getKnowledgeGraph(threshold);
      setData(res);
      
      // Initialize node physics states
      const width = containerRef.current?.clientWidth || 800;
      const height = containerRef.current?.clientHeight || 600;
      
      // Map nodes, keeping existing coordinates if they exist
      const existingNodesMap = new Map(nodesRef.current.map(n => [n.id, n]));
      
      nodesRef.current = res.nodes.map((n, idx) => {
        const existing = existingNodesMap.get(n.id);
        const angle = idx * 0.5;
        const radius = 100 + idx * 10;
        return {
          ...n,
          x: existing ? existing.x : width / 2 + Math.cos(angle) * radius,
          y: existing ? existing.y : height / 2 + Math.sin(angle) * radius,
          vx: 0,
          vy: 0,
          radius: n.pinned ? 20 : 15,
        };
      });

      edgesRef.current = res.edges;
    } catch (err) {
      console.error('Failed to fetch knowledge graph data:', err);
      setError('Failed to load semantic knowledge graph. Ensure notes have embeddings generated.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger reload when threshold changes
  useEffect(() => {
    fetchGraphData();
  }, [threshold]);

  // Extract unique categories dynamically
  const categoriesList = useMemo(() => {
    const cats = data.nodes.map(n => n.category).filter(Boolean);
    return ['all', ...new Set(cats)];
  }, [data.nodes]);

  // Filter nodes & edges for rendering
  const filteredNodes = useMemo(() => {
    return nodesRef.current.filter(n => {
      const matchSearch = n.label.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' || n.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [data.nodes, search, selectedCategory, loading]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return edgesRef.current.filter(e => {
      // both source and target must be visible
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      return nodeIds.has(srcId) && nodeIds.has(tgtId);
    });
  }, [filteredNodes, edgesRef.current]);

  // Main Simulation Loop
  useEffect(() => {
    if (loading || error) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updatePhysicsAndDraw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const center = { x: width / 2, y: height / 2 };

      // ─── 1. Force Simulation Calculations ───
      const kAttract = 0.008; // springs tension
      const kRepel = 2200;    // electrostatic repulsion
      const kCenter = 0.006;  // center pull gravity
      const damping = 0.82;   // friction damping

      // Repulsion between all node pairs
      for (let i = 0; i < filteredNodes.length; i++) {
        const nodeA = filteredNodes[i];
        for (let j = i + 1; j < filteredNodes.length; j++) {
          const nodeB = filteredNodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy + 1; // avoid divide by zero
          const dist = Math.sqrt(distSq);

          if (dist < 250) {
            const force = kRepel / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (nodeA !== dragNodeRef.current) {
              nodeA.vx -= fx;
              nodeA.vy -= fy;
            }
            if (nodeB !== dragNodeRef.current) {
              nodeB.vx += fx;
              nodeB.vy += fy;
            }
          }
        }
      }

      // Attraction along connections (edges)
      for (const edge of filteredEdges) {
        const srcId = typeof edge.source === 'object' ? edge.source.id : edge.source;
        const tgtId = typeof edge.target === 'object' ? edge.target.id : edge.target;

        const nodeA = filteredNodes.find(n => n.id === srcId);
        const nodeB = filteredNodes.find(n => n.id === tgtId);

        if (nodeA && nodeB) {
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 150; // ideal spring length
          const force = (dist - targetDist) * kAttract;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (nodeA !== dragNodeRef.current) {
            nodeA.vx += fx;
            nodeA.vy += fy;
          }
          if (nodeB !== dragNodeRef.current) {
            nodeB.vx -= fx;
            nodeB.vy -= fy;
          }
        }
      }

      // Gravity force to center
      for (const node of filteredNodes) {
        if (node === dragNodeRef.current) continue;
        const dx = center.x - node.x;
        const dy = center.y - node.y;
        node.vx += dx * kCenter;
        node.vy += dy * kCenter;

        // Apply velocities & damping
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= damping;
        node.vy *= damping;
      }

      // ─── 2. Draw Simulation on Canvas ───
      ctx.clearRect(0, 0, width, height);

      // Apply zoom & pan transformations
      ctx.save();
      const transform = transformRef.current;
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // Draw Grid Background lines
      ctx.strokeStyle = 'rgba(179, 56, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      const startX = -transform.x / transform.k - 200;
      const endX = (width - transform.x) / transform.k + 200;
      const startY = -transform.y / transform.k - 200;
      const endY = (height - transform.y) / transform.k + 200;
      
      for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // Draw Connection Edges (Similarity links)
      for (const edge of filteredEdges) {
        const srcId = typeof edge.source === 'object' ? edge.source.id : edge.source;
        const tgtId = typeof edge.target === 'object' ? edge.target.id : edge.target;

        const nodeA = filteredNodes.find(n => n.id === srcId);
        const nodeB = filteredNodes.find(n => n.id === tgtId);

        if (nodeA && nodeB) {
          ctx.beginPath();
          ctx.moveTo(nodeA.x, nodeA.y);
          ctx.lineTo(nodeB.x, nodeB.y);
          
          // Edges opacity mirrors semantic similarity strength
          const strength = (edge.similarity / 100);
          ctx.strokeStyle = `rgba(20, 184, 166, ${0.1 + strength * 0.45})`;
          ctx.lineWidth = 1 + strength * 4;
          ctx.stroke();
        }
      }

      // Draw Nodes
      for (const node of filteredNodes) {
        const isSelected = node.id === selectedNodeId;
        const isHovered = hoverNodeRef.current && hoverNodeRef.current.id === node.id;
        const color = getNodeColor(node.category);

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);

        // Glassmorphism styling with colored glow shadows
        ctx.fillStyle = 'rgba(25, 18, 41, 0.95)';
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 4 : (isHovered ? 3 : (node.pinned ? 2.5 : 1.5));
        
        // Pinned nodes get dotted border style
        if (node.pinned && !isSelected) {
          ctx.setLineDash([4, 4]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Add soft outer glow for pinned or selected nodes
        if (node.pinned || isSelected || isHovered) {
          ctx.shadowColor = color;
          ctx.shadowBlur = isSelected ? 20 : 10;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius - 2, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(${isSelected ? '255,255,255' : '179,56,255'}, 0.2)`;
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }

        // Draw note category label (small pill)
        ctx.font = '8px Sora, sans-serif';
        ctx.fillStyle = 'var(--text-muted)';
        ctx.textAlign = 'center';
        ctx.fillText(node.category.toUpperCase(), node.x, node.y - 4);

        // Draw note titles text
        ctx.font = '10px Sora, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        
        // Truncate long titles
        let text = node.label || 'Untitled Note';
        if (text.length > 15) text = text.slice(0, 13) + '...';
        ctx.fillText(text, node.x, node.y + 7);
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(updatePhysicsAndDraw);
    };

    updatePhysicsAndDraw();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [filteredNodes, filteredEdges, selectedNodeId, loading, error]);

  // Handle Resize of canvas to fill container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // trigger initial layout sizes
    return () => window.removeEventListener('resize', handleResize);
  }, [loading]);

  // Panning & Pointers events handlers
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to simulation canvas coordinates based on zoom/pan
    const transform = transformRef.current;
    const simX = (mouseX - transform.x) / transform.k;
    const simY = (mouseY - transform.y) / transform.k;

    // Check hit test on nodes
    const hitNode = filteredNodes.find(n => {
      const dx = n.x - simX;
      const dy = n.y - simY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 5;
    });

    if (hitNode) {
      dragNodeRef.current = hitNode;
      setSelectedNodeId(hitNode.id);
    } else {
      isPanningRef.current = true;
      startPanRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const transform = transformRef.current;
    const simX = (mouseX - transform.x) / transform.k;
    const simY = (mouseY - transform.y) / transform.k;

    if (dragNodeRef.current) {
      dragNodeRef.current.x = simX;
      dragNodeRef.current.y = simY;
      dragNodeRef.current.vx = 0;
      dragNodeRef.current.vy = 0;
    } else if (isPanningRef.current) {
      transformRef.current = {
        ...transform,
        x: e.clientX - startPanRef.current.x,
        y: e.clientY - startPanRef.current.y
      };
    } else {
      // Check hover states
      const hitNode = filteredNodes.find(n => {
        const dx = n.x - simX;
        const dy = n.y - simY;
        return Math.sqrt(dx * dx + dy * dy) <= n.radius + 5;
      });
      hoverNodeRef.current = hitNode || null;
    }
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
    isPanningRef.current = false;
  };

  // Zoom handling with mouse wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const transform = transformRef.current;
    const zoomFactor = 1.1;
    let nextK = transform.k;

    if (e.deltaY < 0) {
      nextK = Math.min(transform.k * zoomFactor, 3);
    } else {
      nextK = Math.max(transform.k / zoomFactor, 0.25);
    }

    // Zoom centered on mouse location
    const nextX = mouseX - (mouseX - transform.x) * (nextK / transform.k);
    const nextY = mouseY - (mouseY - transform.y) * (nextK / transform.k);

    transformRef.current = { x: nextX, y: nextY, k: nextK };
  };

  const handleResetView = () => {
    const width = canvasRef.current?.width || 800;
    const height = canvasRef.current?.height || 600;
    transformRef.current = { x: 0, y: 0, k: 1 };
    
    // Spread nodes out
    nodesRef.current.forEach((n, idx) => {
      const angle = idx * 0.5;
      const radius = 100 + idx * 10;
      n.x = width / 2 + Math.cos(angle) * radius;
      n.y = height / 2 + Math.sin(angle) * radius;
      n.vx = 0;
      n.vy = 0;
    });
  };

  const handleZoom = (factor) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    const transform = transformRef.current;
    let nextK = transform.k;

    if (factor > 1) {
      nextK = Math.min(transform.k * factor, 3);
    } else {
      nextK = Math.max(transform.k * factor, 0.25);
    }

    const nextX = (width / 2) - ((width / 2) - transform.x) * (nextK / transform.k);
    const nextY = (height / 2) - ((height / 2) - transform.y) * (nextK / transform.k);

    transformRef.current = { x: nextX, y: nextY, k: nextK };
  };

  const handleDoubleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const transform = transformRef.current;
    const simX = (mouseX - transform.x) / transform.k;
    const simY = (mouseY - transform.y) / transform.k;

    const hitNode = filteredNodes.find(n => {
      const dx = n.x - simX;
      const dy = n.y - simY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 5;
    });

    if (hitNode) {
      setViewingNoteId(hitNode.id);
    }
  };

  const selectedNodeInfo = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodesRef.current.find(n => n.id === selectedNodeId);
  }, [selectedNodeId, data.nodes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      {/* Top action header bar */}
      <div className="top-bar" style={{ marginBottom: '16px' }}>
        <div>
          <div className="page-title">🕸️ Knowledge Graph</div>
          <div className="page-subtitle">Visualize semantic notes connections and knowledge clusters</div>
        </div>
      </div>

      {/* Control Console Widget */}
      <div className="graph-controls-card">
        <div className="gc-row">
          <input
            className="search-input"
            style={{ width: '220px', height: '38px', paddingLeft: '16px' }}
            placeholder="🔍 Find node title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select 
            className="filter-select" 
            style={{ height: '38px', background: 'var(--bg-surface)' }}
            value={selectedCategory} 
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categoriesList.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="gc-slider-group">
            <span className="gc-slider-label">Min similarity: {Math.round(threshold * 100)}%</span>
            <input
              type="range"
              min="0.30"
              max="0.85"
              step="0.05"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
            />
          </div>

          <div style={{ flex: 1 }}></div>

          <div className="gc-actions">
            <button className="btn-secondary" onClick={() => handleZoom(1.2)} title="Zoom In">➕</button>
            <button className="btn-secondary" onClick={() => handleZoom(0.85)} title="Zoom Out">➖</button>
            <button className="btn-secondary" onClick={handleResetView}>Reset View</button>
            {selectedNodeId && (
              <button className="btn-primary" onClick={() => setViewingNoteId(selectedNodeId)}>Open Note</button>
            )}
          </div>
        </div>
      </div>

      {/* Graph Visualizer Canvas Area */}
      <div 
        ref={containerRef} 
        style={{ 
          flex: 1, 
          position: 'relative', 
          background: 'rgba(10, 7, 23, 0.4)', 
          border: '1px solid var(--glass-border)', 
          borderRadius: 'var(--radius-lg)', 
          overflow: 'hidden',
          cursor: isPanningRef.current ? 'grabbing' : 'grab'
        }}
      >
        {loading ? (
          <div className="yd-plan-preparing" style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="yd-plan-spinner"></div>
            <div>Constructing semantic note mapping...</div>
          </div>
        ) : error ? (
          <div className="yd-empty" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', flexDirection: 'column' }}>
            <div>⚠️ {error}</div>
            <button className="btn-secondary" style={{ marginTop: 12 }} onClick={fetchGraphData}>Retry</button>
          </div>
        ) : data.nodes.length === 0 ? (
          <div className="yd-empty" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            No notes found. Write some notes with content to visualize the semantic network graph.
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              style={{ display: 'block', width: '100%', height: '100%' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
            />

            {/* Hover Node Tooltip Box */}
            {hoverNodeRef.current && (
              <div 
                className="graph-tooltip"
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'var(--bg-glass)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid var(--glass-border)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  pointerEvents: 'none',
                  boxShadow: 'var(--shadow-card)',
                  maxWidth: 240
                }}
              >
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '13px', marginBottom: '4px' }}>
                  {hoverNodeRef.current.label}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className="tag-pill" style={{ fontSize: '9px', padding: '2px 6px' }}>
                    {hoverNodeRef.current.category}
                  </span>
                  {hoverNodeRef.current.pinned && (
                    <span style={{ fontSize: '10px' }}>📌 Pinned</span>
                  )}
                  {hoverNodeRef.current.isShared && (
                    <span style={{ fontSize: '10px' }}>👥 Shared</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Double-click node to edit note.
                </div>
              </div>
            )}

            {/* Selected Node Details HUD Widget */}
            {selectedNodeInfo && (
              <div 
                className="graph-hud"
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  background: 'var(--bg-glass)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid var(--glass-border)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-card)',
                  width: '280px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--neon-purple)' }}>SELECTED OBJECT</span>
                  <button 
                    style={{ color: 'var(--text-muted)', fontSize: '14px', background: 'none' }}
                    onClick={() => setSelectedNodeId(null)}
                  >
                    ×
                  </button>
                </div>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>
                  {selectedNodeInfo.label}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <span className="tag-pill" style={{ fontSize: '10px' }}>{selectedNodeInfo.category}</span>
                  {selectedNodeInfo.pinned && <span>📌</span>}
                </div>
                <button 
                  className="btn-primary" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setViewingNoteId(selectedNodeInfo.id)}
                >
                  Edit details
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Note Inspection Detail Modal */}
      {viewingNoteId && (
        <NoteDetailModal
          noteId={viewingNoteId}
          onClose={() => { setViewingNoteId(null); fetchGraphData(); }}
        />
      )}
    </div>
  );
}

export default KnowledgeGraph;
