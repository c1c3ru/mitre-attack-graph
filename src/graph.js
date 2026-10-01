/**
 * Motor de renderização: SVG + d3.forceSimulation + pan/zoom + destaque de vizinhança.
 */
import * as d3 from 'd3';

const RADIUS = { group: 18, software: 9, technique: 5 };
const RING = { group: 0, software: 0.42, technique: 1 }; // raio relativo de cada camada

export function createGraph(svgEl, { onSelect, onHover } = {}) {
  const svg = d3.select(svgEl);
  const root = svg.append('g').attr('class', 'viewport');
  const linkLayer = root.append('g').attr('class', 'links');
  const nodeLayer = root.append('g').attr('class', 'nodes');
  const labelLayer = root.append('g').attr('class', 'labels');

  let nodes = [];
  let links = [];
  let adjacency = new Map();
  let selectedId = null;
  let fitted = false;
  const positions = new Map(); // preserva posições entre re-renderizações

  const size = () => {
    const r = svgEl.getBoundingClientRect();
    return { width: r.width || 800, height: r.height || 600 };
  };

  // ---------- Zoom / Pan ----------
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 6])
    .on('zoom', (event) => {
      root.attr('transform', event.transform);
      svg.classed('zoomed-in', event.transform.k >= 1.5);
    });
  svg.call(zoom).on('dblclick.zoom', null);
  svg.on('click', (event) => {
    if (event.target === svgEl) select(null);
  });

  // ---------- Simulação de forças ----------
  const simulation = d3
    .forceSimulation()
    .alphaDecay(0.035)
    .velocityDecay(0.45)
    .force(
      'link',
      d3
        .forceLink()
        .id((d) => d.id)
        .distance((l) => (l.kind === 'gs' ? 110 : l.kind === 'gt' ? 200 : 70))
        .strength((l) => (l.kind === 'st' ? 0.15 : 0.35)),
    )
    .force('charge', d3.forceManyBody().strength((d) => (d.type === 'group' ? -900 : d.type === 'software' ? -220 : -45)).theta(0.9).distanceMax(600))
    .force('collide', d3.forceCollide().radius((d) => d.r + 2).iterations(1))
    .force('center', d3.forceCenter(0, 0).strength(0.05))
    .on('tick', ticked)
    .on('end', () => {
      if (!fitted) {
        fitted = true;
        fitToView(750);
      }
    });

  let linkSel = linkLayer.selectAll('line');
  let nodeSel = nodeLayer.selectAll('g.node');
  let labelSel = labelLayer.selectAll('text');

  function ticked() {
    linkSel
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
    nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
    labelSel.attr('x', (d) => d.x).attr('y', (d) => d.y + d.r + 11);
  }

  function update(graph) {
    // posições anteriores
    for (const n of nodes) positions.set(n.id, { x: n.x, y: n.y });

    const degree = new Map();
    for (const l of graph.links) {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    }
    const nGroups = graph.nodes.filter((n) => n.type === 'group').length;
    const ringBase = Math.max(260, Math.sqrt(graph.nodes.length) * 22);

    nodes = graph.nodes.map((n, i) => {
      const prev = positions.get(n.id);
      const deg = degree.get(n.id) ?? 0;
      const r = n.type === 'technique' ? RADIUS.technique + Math.min(6, Math.sqrt(deg)) : n.type === 'software' ? RADIUS.software + Math.min(6, Math.sqrt(deg) / 1.5) : RADIUS.group;
      const angle = (i / graph.nodes.length) * 2 * Math.PI;
      const rr = RING[n.type] * ringBase + (n.type === 'group' && nGroups > 1 ? 120 : 0);
      return { ...n, r, degree: deg, x: prev?.x ?? Math.cos(angle) * rr, y: prev?.y ?? Math.sin(angle) * rr };
    });
    links = graph.links.map((l) => ({ ...l }));

    adjacency = new Map(nodes.map((n) => [n.id, { out: new Set(), in: new Set() }]));
    for (const l of links) {
      adjacency.get(l.source).out.add(l.target);
      adjacency.get(l.target).in.add(l.source);
    }

    // Força radial por camada: grupos no centro, software no meio, técnicas na borda
    simulation.force(
      'radial',
      d3
        .forceRadial((d) => RING[d.type] * ringBase + (d.type === 'group' && nGroups > 1 ? 120 : 0), 0, 0)
        .strength((d) => (d.type === 'technique' ? 0.12 : 0.25)),
    );

    linkSel = linkLayer
      .selectAll('line')
      .data(links, (d) => `${d.source}>${d.target}`)
      .join('line')
      .attr('class', (d) => `link ${d.kind}`);

    nodeSel = nodeLayer
      .selectAll('g.node')
      .data(nodes, (d) => d.id)
      .join((enter) => {
        const g = enter.append('g');
        g.append('circle');
        return g;
      })
      .attr('class', (d) => `node ${d.type}`)
      .attr('data-id', (d) => d.id)
      .on('click', (event, d) => {
        event.stopPropagation();
        select(d.id === selectedId ? null : d.id);
      })
      .on('mouseenter', (event, d) => onHover?.(d, event))
      .on('mousemove', (event, d) => onHover?.(d, event))
      .on('mouseleave', () => onHover?.(null))
      .call(drag());
    nodeSel.select('circle').attr('r', (d) => d.r);

    labelSel = labelLayer
      .selectAll('text')
      .data(nodes, (d) => d.id)
      .join('text')
      .attr('class', (d) => `label ${d.type}`)
      .attr('text-anchor', 'middle')
      .text((d) => (d.type === 'technique' ? `${d.id} ${truncate(d.name, 26)}` : d.name));

    simulation.nodes(nodes);
    simulation.force('link').links(links);
    fitted = false;
    simulation.alpha(1).restart();

    if (selectedId && !adjacency.has(selectedId)) select(null);
    else applyHighlight();
    return { nodes: nodes.length, links: links.length };
  }

  function drag() {
    return d3
      .drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.15).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  /** Grupo: toda a cadeia descendente (Grupo -> Software -> Técnica). Demais: vizinhos imediatos. */
  function neighborhood(id) {
    const set = new Set([id]);
    const node = nodes.find((n) => n.id === id);
    const adj = adjacency.get(id);
    if (!adj) return set;
    if (node?.type === 'group') {
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop();
        for (const t of adjacency.get(cur).out) if (!set.has(t)) (set.add(t), stack.push(t));
      }
    } else {
      adj.out.forEach((t) => set.add(t));
      adj.in.forEach((s) => set.add(s));
    }
    return set;
  }

  function applyHighlight() {
    const focus = selectedId ? neighborhood(selectedId) : null;
    const isGroup = selectedId && nodes.find((n) => n.id === selectedId)?.type === 'group';
    svg.classed('has-focus', Boolean(focus)).classed('group-focus', Boolean(isGroup));
    nodeSel.classed('hl', (d) => focus?.has(d.id) ?? false).classed('selected', (d) => d.id === selectedId);
    labelSel.classed('hl', (d) => focus?.has(d.id) ?? false);
    linkSel.classed('hl', (d) => {
      if (!focus) return false;
      const s = d.source.id ?? d.source;
      const t = d.target.id ?? d.target;
      return isGroup ? focus.has(s) && focus.has(t) : s === selectedId || t === selectedId;
    });
  }

  function select(id) {
    selectedId = id;
    applyHighlight();
    onSelect?.(id);
  }

  function focusNode(id) {
    const n = nodes.find((d) => d.id === id);
    if (!n) return false;
    select(id);
    const { width, height } = size();
    const k = Math.max(1.6, d3.zoomTransform(svgEl).k);
    svg.transition().duration(600).call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-n.x, -n.y));
    return true;
  }

  function fitToView(duration = 500) {
    if (!nodes.length) return;
    const { width, height } = size();
    const [minX, maxX] = d3.extent(nodes, (d) => d.x);
    const [minY, maxY] = d3.extent(nodes, (d) => d.y);
    const w = maxX - minX + 80;
    const h = maxY - minY + 80;
    const k = Math.min(2, 0.92 * Math.min(width / w, height / h));
    const t = d3.zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
    svg.transition().duration(duration).call(zoom.transform, t);
  }

  // estado inicial: origem no centro do SVG
  const { width, height } = size();
  svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.6));

  return {
    update,
    select,
    focusNode,
    fitToView,
    has: (id) => adjacency.has(id),
    get selectedId() {
      return selectedId;
    },
  };
}

function truncate(s, n) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
