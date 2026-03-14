import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type { Thought, Neighborhood, Link } from '../../../shared/types'

interface PlexNode {
  id: string; title: string; color: string
  role: 'active' | 'parent' | 'child' | 'jump' | 'sibling'
  targetX: number; targetY: number
  // gate fill states
  hasParents: boolean; hasChildren: boolean; hasJumps: boolean; hasSiblings: boolean
}

interface PlexLink {
  sourceId: string; targetId: string
  type: 'child' | 'jump'; label: string; isOneWay: boolean
}

interface PlexProps {
  neighborhood: Neighborhood | null
  activeId: string | null
  onNavigate: (id: string) => void
  onCreateChild: () => void
}

// Layout constants — TheBrain standard positions
const NODE_R = 34
const ACTIVE_R = 50
const PARENT_Y = -185      // parents above
const CHILD_Y = 185        // children below
const JUMP_X = -265        // jumps to the LEFT
const SIBLING_X = 265      // siblings to the RIGHT
const SPREAD = 150
const DUR = 520

function spreadPos(count: number, idx: number, axis: 'x' | 'y', base: number): number {
  if (count === 1) return base
  return base + (idx - (count - 1) / 2) * SPREAD
}

function layoutNeighborhood(n: Neighborhood, cx: number, cy: number): { nodes: PlexNode[]; links: PlexLink[] } {
  const { thought, parents, children, jumps, siblings, links } = n
  const nodes: PlexNode[] = []

  const hasParents = parents.length > 0
  const hasChildren = children.length > 0
  const hasJumps = jumps.length > 0
  const hasSiblings = siblings.length > 0

  const gateState = (t: Thought) => ({
    hasParents: true, hasChildren: true, hasJumps: true, hasSiblings: true
  })

  const push = (t: Thought, role: PlexNode['role'], tx: number, ty: number) =>
    nodes.push({ id: t.id, title: t.title, color: t.color, role, targetX: tx, targetY: ty, ...gateState(t) })

  // Active at center
  nodes.push({
    id: thought.id, title: thought.title, color: thought.color, role: 'active',
    targetX: cx, targetY: cy, hasParents, hasChildren, hasJumps, hasSiblings
  })

  // Parents — spread horizontally above
  parents.forEach((p, i) => push(p, 'parent', spreadPos(parents.length, i, 'x', cx), cy + PARENT_Y))

  // Children — spread horizontally below
  children.forEach((c, i) => push(c, 'child', spreadPos(children.length, i, 'x', cx), cy + CHILD_Y))

  // Jumps — spread vertically to the LEFT
  jumps.forEach((j, i) => push(j, 'jump', cx + JUMP_X, spreadPos(jumps.length, i, 'y', cy)))

  // Siblings — spread vertically to the RIGHT
  siblings.forEach((s, i) => push(s, 'sibling', cx + SIBLING_X, spreadPos(siblings.length, i, 'y', cy)))

  const plexLinks: PlexLink[] = links.map((l: Link) => ({
    sourceId: l.source_id, targetId: l.target_id,
    type: l.type, label: l.label || '', isOneWay: l.is_one_way === 1
  }))

  return { nodes, links: plexLinks }
}

function curvePath(sx: number, sy: number, tx: number, ty: number): string {
  const dx = tx - sx, dy = ty - sy
  const mx = sx + dx / 2, my = sy + dy / 2
  // Add gentle curve perpendicular to the line
  const perp = Math.abs(dy) < 30 ? 30 : 0
  return `M${sx},${sy} Q${mx},${my + perp} ${tx},${ty}`
}

const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n - 1) + '…' : s

const ROLE_LABEL: Record<PlexNode['role'], string> = {
  active: '', parent: 'parent', child: '', jump: 'jump', sibling: 'sibling'
}
const ROLE_LABEL_DY: Record<PlexNode['role'], number> = {
  active: 0, parent: -(NODE_R + 10), child: NODE_R + 16, jump: -(NODE_R + 10), sibling: -(NODE_R + 10)
}

export function Plex({ neighborhood, activeId, onNavigate, onCreateChild }: PlexProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const sizeRef = useRef({ w: 900, h: 600 })

  // One-time setup: zoom + defs (arrowhead marker)
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Define arrowhead marker for one-way links
    const defs = svg.append('defs')
    defs.append('marker')
      .attr('id', 'arrow').attr('markerWidth', 8).attr('markerHeight', 6)
      .attr('refX', 8).attr('refY', 3).attr('orient', 'auto')
      .append('polygon').attr('points', '0 0, 8 3, 0 6').attr('fill', '#f0a500')

    const g = svg.append('g').attr('class', 'plex-root')
    gRef.current = g.node()
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 4]).on('zoom', e => g.attr('transform', e.transform)))
    svg.on('dblclick.zoom', null)
  }, [])

  // Resize observer
  useEffect(() => {
    if (!svgRef.current) return
    const obs = new ResizeObserver(entries => {
      sizeRef.current = { w: entries[0].contentRect.width, h: entries[0].contentRect.height }
    })
    obs.observe(svgRef.current.parentElement!)
    return () => obs.disconnect()
  }, [])

  const render = useCallback(() => {
    if (!neighborhood || !gRef.current) return
    const g = d3.select(gRef.current)
    const { w, h } = sizeRef.current
    const { nodes, links } = layoutNeighborhood(neighborhood, w / 2, h / 2)
    const nm = new Map(nodes.map(n => [n.id, n]))

    // ── Links ──────────────────────────────────────────────────────────────
    const lSel = g.selectAll<SVGGElement, PlexLink>('g.pl').data(links, d => `${d.sourceId}-${d.targetId}-${d.type}`)
    const lEnter = lSel.enter().append('g').attr('class', 'pl').attr('opacity', 0)

    lEnter.append('path')
      .attr('fill', 'none').attr('stroke-width', 1.5)
      .attr('stroke', d => d.type === 'jump' ? '#f0a500' : '#5a7fa0')
      .attr('stroke-dasharray', d => d.type === 'jump' ? '5,3' : 'none')

    lEnter.append('text')
      .attr('class', 'll')
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(180,200,220,0.7)')
      .attr('font-size', 10)
      .attr('pointer-events', 'none')

    const lMerge = lEnter.merge(lSel)

    lMerge.select('path')
      .attr('stroke', d => d.type === 'jump' ? '#f0a500' : '#5a7fa0')
      .attr('stroke-dasharray', d => d.type === 'jump' ? '5,3' : 'none')
      .attr('marker-end', d => d.isOneWay ? 'url(#arrow)' : null)

    lMerge.select<SVGTextElement>('text.ll').text(d => d.label)

    lMerge.transition().duration(DUR).ease(d3.easeCubicInOut).attr('opacity', 1)
      .each(function(d) {
        const s = nm.get(d.sourceId), t = nm.get(d.targetId)
        if (!s || !t) return
        const path = curvePath(s.targetX, s.targetY, t.targetX, t.targetY)
        d3.select(this).select('path').attr('d', path)
        // Position label at midpoint of path
        const mx = (s.targetX + t.targetX) / 2
        const my = (s.targetY + t.targetY) / 2
        d3.select(this).select('text').attr('x', mx).attr('y', my - 6)
      })

    lSel.exit().transition().duration(DUR / 2).attr('opacity', 0).remove()

    // ── Nodes ──────────────────────────────────────────────────────────────
    const nSel = g.selectAll<SVGGElement, PlexNode>('g.pn').data(nodes, d => d.id)

    const nEnter = nSel.enter().append('g').attr('class', 'pn').attr('cursor', 'pointer')
      .attr('transform', d => `translate(${d.targetX},${d.targetY})`).attr('opacity', 0)

    // Main circle
    nEnter.append('circle').attr('class', 'main-circle')
      .attr('r', d => d.role === 'active' ? ACTIVE_R : NODE_R)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.role === 'active' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)')
      .attr('stroke-width', d => d.role === 'active' ? 2.5 : 1.5)
      .style('filter', d => d.role === 'active' ? 'drop-shadow(0 0 14px rgba(255,255,255,0.35))' : 'none')

    // Title text
    nEnter.append('text').attr('class', 'ntitle')
      .attr('text-anchor', 'middle').attr('dy', '0.35em').attr('fill', '#fff')
      .attr('font-size', d => d.role === 'active' ? 13 : 11)
      .attr('font-weight', d => d.role === 'active' ? '600' : '400')
      .attr('pointer-events', 'none')
      .text(d => trunc(d.title, d.role === 'active' ? 14 : 11))

    // Role label
    nEnter.append('text').attr('class', 'nrole')
      .attr('text-anchor', 'middle').attr('fill', 'rgba(170,190,210,0.5)').attr('font-size', 9).attr('pointer-events', 'none')

    // Gate indicators — 4 small dots at N/S/W/E
    const gates: [string, number, number, string][] = [
      ['gate-n', 0, -(NODE_R + 5), 'parent'],
      ['gate-s', 0, NODE_R + 5, 'child'],
      ['gate-w', -(NODE_R + 5), 0, 'jump'],
      ['gate-e', NODE_R + 5, 0, 'sibling']
    ]
    gates.forEach(([cls, dx, dy, _role]) => {
      nEnter.append('circle').attr('class', cls)
        .attr('r', 3.5).attr('cx', dx).attr('cy', dy)
        .attr('pointer-events', 'none')
    })

    nEnter.on('click', (_, d) => { if (d.id !== activeId) onNavigate(d.id) })

    const nMerge = nEnter.merge(nSel)

    // Update circle attrs
    nMerge.select<SVGCircleElement>('circle.main-circle')
      .attr('r', d => d.role === 'active' ? ACTIVE_R : NODE_R)
      .attr('stroke', d => d.role === 'active' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)')
      .attr('stroke-width', d => d.role === 'active' ? 2.5 : 1.5)
      .style('filter', d => d.role === 'active' ? 'drop-shadow(0 0 14px rgba(255,255,255,0.35))' : 'none')

    nMerge.select<SVGTextElement>('text.ntitle').text(d => trunc(d.title, d.role === 'active' ? 14 : 11))
    nMerge.select<SVGTextElement>('text.nrole')
      .attr('dy', d => ROLE_LABEL_DY[d.role])
      .text(d => ROLE_LABEL[d.role])

    // Update gate indicators
    nMerge.select<SVGCircleElement>('circle.gate-n').attr('fill', d => d.hasParents ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)')
    nMerge.select<SVGCircleElement>('circle.gate-s').attr('fill', d => d.hasChildren ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)')
    nMerge.select<SVGCircleElement>('circle.gate-w').attr('fill', d => d.hasJumps ? '#f0a500' : 'rgba(255,255,255,0.15)')
    nMerge.select<SVGCircleElement>('circle.gate-e').attr('fill', d => d.hasSiblings ? 'rgba(120,200,255,0.8)' : 'rgba(255,255,255,0.15)')

    // Transition positions
    nMerge.transition().duration(DUR).ease(d3.easeCubicInOut).attr('opacity', 1)
      .attr('transform', d => `translate(${d.targetX},${d.targetY})`)

    nSel.exit().transition().duration(DUR / 2).attr('opacity', 0).remove()

    // Hover effects
    nMerge.on('mouseenter', function(_, d) {
      if (d.role === 'active') return
      d3.select(this).select<SVGCircleElement>('circle.main-circle')
        .transition().duration(140).attr('stroke', 'rgba(255,255,255,0.75)').attr('stroke-width', 2.5)
        .attr('r', d.role === 'active' ? ACTIVE_R : NODE_R + 3)
    }).on('mouseleave', function(_, d) {
      if (d.role === 'active') return
      d3.select(this).select<SVGCircleElement>('circle.main-circle')
        .transition().duration(140).attr('stroke', 'rgba(255,255,255,0.2)').attr('stroke-width', 1.5)
        .attr('r', NODE_R)
    })
  }, [neighborhood, activeId, onNavigate])

  useEffect(() => { render() }, [render])

  return (
    <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(ellipse at center, #1a2535 0%, #0d1117 100%)', overflow: 'hidden' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Legend */}
      {neighborhood && (
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 12, opacity: 0.45, fontSize: 10, color: '#8aa', pointerEvents: 'none', userSelect: 'none' }}>
          <span>● parent (above)</span>
          <span>● child (below)</span>
          <span style={{ color: '#f0a500' }}>● jump (left)</span>
          <span style={{ color: '#7cd' }}>● sibling (right)</span>
        </div>
      )}

      {!neighborhood && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 15, gap: 14, userSelect: 'none' }}>
          <div style={{ fontSize: 52 }}>🧠</div>
          <div>No thoughts yet.</div>
          <div style={{ fontSize: 13 }}>Press ⌘N or click "+ New Thought" to begin.</div>
        </div>
      )}

      {neighborhood && (
        <button onClick={onCreateChild} style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(74,144,226,0.75)', color: '#fff', border: 'none', borderRadius: 20, padding: '7px 20px', fontSize: 12, cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
          + Add child thought
        </button>
      )}
    </div>
  )
}
