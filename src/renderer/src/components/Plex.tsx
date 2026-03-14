import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type { Thought, Neighborhood, Link, ThoughtType, LinkType } from '../../../shared/types'

interface PlexNode {
  id: string; title: string; color: string
  role: 'active' | 'parent' | 'child' | 'jump' | 'sibling'
  targetX: number; targetY: number
  typeIcon: string
  // gate fill states
  hasParents: boolean; hasChildren: boolean; hasJumps: boolean; hasSiblings: boolean
}

interface PlexLink {
  sourceId: string; targetId: string
  type: 'child' | 'jump'; label: string; isOneWay: boolean
  color: string; width: number; linkTypeId: string | null
}

interface PlexProps {
  neighborhood: Neighborhood | null
  activeId: string | null
  allTypes: ThoughtType[]
  allLinkTypes: LinkType[]
  onNavigate: (id: string) => void
  onCreateChild: () => void
  onCreateLink: (sourceId: string, targetId: string, type: 'child' | 'jump') => void
}

// Layout constants — TheBrain standard positions
const NODE_R = 34
const ACTIVE_R = 50
const PARENT_Y = -185
const CHILD_Y = 185
const JUMP_X = -265
const SIBLING_X = 265
const SPREAD = 150
const DUR = 520
const DRAG_THRESH = 60

function spreadPos(count: number, idx: number, base: number): number {
  if (count === 1) return base
  return base + (idx - (count - 1) / 2) * SPREAD
}

function resolveLink(l: { color: string; width: number; link_type_id: string | null; type: string }, allLinkTypes: LinkType[]) {
  const lt = allLinkTypes.find(t => t.id === l.link_type_id)
  return {
    color: l.color || lt?.color || (l.type === 'child' ? '#5a7fa0' : '#f0a500'),
    width: l.width || lt?.width || 1.5
  }
}

function layoutNeighborhood(n: Neighborhood, cx: number, cy: number, allTypes: ThoughtType[]): { nodes: PlexNode[]; links: PlexLink[] } {
  const { thought, parents, children, jumps, siblings, links } = n
  const nodes: PlexNode[] = []

  const hasParents = parents.length > 0
  const hasChildren = children.length > 0
  const hasJumps = jumps.length > 0
  const hasSiblings = siblings.length > 0

  const typeIcon = (t: Thought) => allTypes.find(ty => ty.id === t.type_id)?.icon || ''

  const push = (t: Thought, role: PlexNode['role'], tx: number, ty: number) =>
    nodes.push({
      id: t.id, title: t.title, color: t.color, role,
      targetX: tx, targetY: ty, typeIcon: typeIcon(t),
      hasParents: true, hasChildren: true, hasJumps: true, hasSiblings: true
    })

  // Active at center
  nodes.push({
    id: thought.id, title: thought.title, color: thought.color, role: 'active',
    targetX: cx, targetY: cy, typeIcon: typeIcon(thought),
    hasParents, hasChildren, hasJumps, hasSiblings
  })

  // Parents
  parents.forEach((p, i) => push(p, 'parent', spreadPos(parents.length, i, cx), cy + PARENT_Y))

  // Children
  children.forEach((c, i) => push(c, 'child', spreadPos(children.length, i, cx), cy + CHILD_Y))

  // Jumps — LEFT
  jumps.forEach((j, i) => push(j, 'jump', cx + JUMP_X, spreadPos(jumps.length, i, cy)))

  // Siblings — RIGHT
  siblings.forEach((s, i) => push(s, 'sibling', cx + SIBLING_X, spreadPos(siblings.length, i, cy)))

  const plexLinks: PlexLink[] = links.map((l: Link) => ({
    sourceId: l.source_id, targetId: l.target_id,
    type: l.type, label: l.label || '', isOneWay: l.is_one_way === 1,
    color: l.color || '', width: l.width || 0, linkTypeId: l.link_type_id
  }))

  return { nodes, links: plexLinks }
}

function curvePath(sx: number, sy: number, tx: number, ty: number): string {
  const dx = tx - sx, dy = ty - sy
  const mx = sx + dx / 2, my = sy + dy / 2
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

export function Plex({ neighborhood, activeId, allTypes, allLinkTypes, onNavigate, onCreateChild, onCreateLink }: PlexProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const sizeRef = useRef({ w: 900, h: 600 })
  const nodesRef = useRef<PlexNode[]>([])
  const onCreateLinkRef = useRef(onCreateLink)

  useEffect(() => { onCreateLinkRef.current = onCreateLink }, [onCreateLink])

  // One-time setup: zoom + defs
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

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
    const { nodes, links } = layoutNeighborhood(neighborhood, w / 2, h / 2, allTypes)
    nodesRef.current = nodes
    const nm = new Map(nodes.map(n => [n.id, n]))

    // ── Drag-to-link behavior ───────────────────────────────────────────────
    function makeDrag(gateType: 'parent' | 'child' | 'jump') {
      let dragLine: d3.Selection<SVGLineElement, unknown, SVGGElement, unknown> | null = null

      return d3.drag<SVGCircleElement, PlexNode>()
        .on('start', function(_, d) {
          dragLine = g.append('line')
            .attr('class', 'drag-line')
            .attr('x1', d.targetX).attr('y1', d.targetY)
            .attr('x2', d.targetX).attr('y2', d.targetY)
            .attr('stroke', 'rgba(255,255,255,0.55)')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '4 3')
            .attr('pointer-events', 'none')
        })
        .on('drag', function(event, d) {
          const [mx, my] = d3.pointer(event.sourceEvent, gRef.current!)
          dragLine?.attr('x2', mx).attr('y2', my)

          g.selectAll<SVGGElement, PlexNode>('g.pn').each(function(n) {
            const dx2 = n.targetX - mx, dy2 = n.targetY - my
            const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)
            const isTarget = dist < DRAG_THRESH && n.id !== d.id
            d3.select(this).select<SVGCircleElement>('circle.main-circle')
              .attr('stroke', isTarget ? '#fff' : (n.role === 'active' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)'))
              .attr('stroke-width', isTarget ? 3 : (n.role === 'active' ? 2.5 : 1.5))
          })
        })
        .on('end', function(event, d) {
          const [mx, my] = d3.pointer(event.sourceEvent, gRef.current!)
          dragLine?.remove(); dragLine = null

          // Reset highlight
          g.selectAll<SVGGElement, PlexNode>('g.pn').select<SVGCircleElement>('circle.main-circle')
            .attr('stroke', n => n.role === 'active' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)')
            .attr('stroke-width', n => n.role === 'active' ? 2.5 : 1.5)

          // Find nearest node within threshold
          let nearest: PlexNode | null = null
          let nearestDist = Infinity
          nodesRef.current.forEach(n => {
            if (n.id === d.id) return
            const dx2 = n.targetX - mx, dy2 = n.targetY - my
            const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)
            if (dist < DRAG_THRESH && dist < nearestDist) { nearest = n; nearestDist = dist }
          })

          if (nearest) {
            const tgt = nearest as PlexNode
            if (gateType === 'child')  onCreateLinkRef.current(d.id, tgt.id, 'child')
            else if (gateType === 'parent') onCreateLinkRef.current(tgt.id, d.id, 'child')
            else onCreateLinkRef.current(d.id, tgt.id, 'jump')
          }
        })
    }

    const dragParent = makeDrag('parent')
    const dragChild  = makeDrag('child')
    const dragJump   = makeDrag('jump')

    // ── Links ───────────────────────────────────────────────────────────────
    const lSel = g.selectAll<SVGGElement, PlexLink>('g.pl').data(links, d => `${d.sourceId}-${d.targetId}-${d.type}`)
    const lEnter = lSel.enter().append('g').attr('class', 'pl').attr('opacity', 0)

    lEnter.append('path').attr('fill', 'none')
    lEnter.append('text').attr('class', 'll')
      .attr('text-anchor', 'middle').attr('fill', 'rgba(180,200,220,0.7)')
      .attr('font-size', 10).attr('pointer-events', 'none')

    const lMerge = lEnter.merge(lSel)

    lMerge.select<SVGPathElement>('path')
      .attr('stroke', d => {
        const { color } = resolveLink(d as unknown as { color: string; width: number; link_type_id: string | null; type: string }, allLinkTypes)
        return color
      })
      .attr('stroke-width', d => {
        const { width } = resolveLink(d as unknown as { color: string; width: number; link_type_id: string | null; type: string }, allLinkTypes)
        return width
      })
      .attr('stroke-dasharray', d => d.type === 'jump' ? '5,3' : 'none')
      .attr('marker-end', d => d.isOneWay ? 'url(#arrow)' : null)

    lMerge.select<SVGTextElement>('text.ll').text(d => d.label)

    lMerge.transition().duration(DUR).ease(d3.easeCubicInOut).attr('opacity', 1)
      .each(function(d) {
        const s = nm.get(d.sourceId), t = nm.get(d.targetId)
        if (!s || !t) return
        d3.select(this).select('path').attr('d', curvePath(s.targetX, s.targetY, t.targetX, t.targetY))
        d3.select(this).select('text')
          .attr('x', (s.targetX + t.targetX) / 2)
          .attr('y', (s.targetY + t.targetY) / 2 - 6)
      })

    lSel.exit().transition().duration(DUR / 2).attr('opacity', 0).remove()

    // ── Nodes ───────────────────────────────────────────────────────────────
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

    // Type icon text
    nEnter.append('text').attr('class', 'nicon')
      .attr('text-anchor', 'middle').attr('pointer-events', 'none').attr('fill', '#fff')

    // Title text
    nEnter.append('text').attr('class', 'ntitle')
      .attr('text-anchor', 'middle').attr('fill', '#fff')
      .attr('font-weight', d => d.role === 'active' ? '600' : '400')
      .attr('pointer-events', 'none')

    // Role label
    nEnter.append('text').attr('class', 'nrole')
      .attr('text-anchor', 'middle').attr('fill', 'rgba(170,190,210,0.5)').attr('font-size', 9).attr('pointer-events', 'none')

    // Gate indicators (draggable)
    const gateSpecs: [string, number, number, typeof dragParent][] = [
      ['gate-n', 0, -(NODE_R + 5), dragParent],
      ['gate-s', 0, NODE_R + 5, dragChild],
      ['gate-w', -(NODE_R + 5), 0, dragJump],
      ['gate-e', NODE_R + 5, 0, dragJump],
    ]

    gateSpecs.forEach(([cls, dx, dy, drag]) => {
      nEnter.append('circle').attr('class', `gate ${cls}`)
        .attr('r', 4).attr('cx', dx).attr('cy', dy)
        .attr('cursor', 'crosshair')
        .attr('pointer-events', 'all')
        .on('click', (e) => e.stopPropagation())
        .call(drag as d3.DragBehavior<SVGCircleElement, PlexNode, unknown>)
    })

    nEnter.on('click', (_, d) => { if (d.id !== activeId) onNavigate(d.id) })

    const nMerge = nEnter.merge(nSel)

    // Update circle attrs
    nMerge.select<SVGCircleElement>('circle.main-circle')
      .attr('r', d => d.role === 'active' ? ACTIVE_R : NODE_R)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.role === 'active' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)')
      .attr('stroke-width', d => d.role === 'active' ? 2.5 : 1.5)
      .style('filter', d => d.role === 'active' ? 'drop-shadow(0 0 14px rgba(255,255,255,0.35))' : 'none')

    // Type icon
    nMerge.select<SVGTextElement>('text.nicon')
      .attr('font-size', d => d.role === 'active' ? 20 : 14)
      .attr('dy', d => d.typeIcon ? (d.role === 'active' ? '-0.35em' : '-0.3em') : '0em')
      .text(d => d.typeIcon)

    // Title — shift down if icon present
    nMerge.select<SVGTextElement>('text.ntitle')
      .attr('font-size', d => d.role === 'active' ? 13 : 11)
      .attr('dy', d => {
        if (!d.typeIcon) return '0.35em'
        return d.role === 'active' ? '1em' : '0.9em'
      })
      .text(d => trunc(d.title, d.role === 'active' ? 14 : 11))

    nMerge.select<SVGTextElement>('text.nrole')
      .attr('dy', d => ROLE_LABEL_DY[d.role])
      .text(d => ROLE_LABEL[d.role])

    // Gates
    nMerge.select<SVGCircleElement>('circle.gate-n').attr('fill', d => d.hasParents ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)')
    nMerge.select<SVGCircleElement>('circle.gate-s').attr('fill', d => d.hasChildren ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)')
    nMerge.select<SVGCircleElement>('circle.gate-w').attr('fill', d => d.hasJumps ? '#f0a500' : 'rgba(255,255,255,0.15)')
    nMerge.select<SVGCircleElement>('circle.gate-e').attr('fill', d => d.hasSiblings ? 'rgba(120,200,255,0.8)' : 'rgba(255,255,255,0.15)')

    // Transition positions
    nMerge.transition().duration(DUR).ease(d3.easeCubicInOut).attr('opacity', 1)
      .attr('transform', d => `translate(${d.targetX},${d.targetY})`)

    nSel.exit().transition().duration(DUR / 2).attr('opacity', 0).remove()

    // Hover
    nMerge.on('mouseenter', function(_, d) {
      if (d.role === 'active') return
      d3.select(this).select<SVGCircleElement>('circle.main-circle')
        .transition().duration(140).attr('stroke', 'rgba(255,255,255,0.75)').attr('stroke-width', 2.5).attr('r', NODE_R + 3)
    }).on('mouseleave', function(_, d) {
      if (d.role === 'active') return
      d3.select(this).select<SVGCircleElement>('circle.main-circle')
        .transition().duration(140).attr('stroke', 'rgba(255,255,255,0.2)').attr('stroke-width', 1.5).attr('r', NODE_R)
    })
  }, [neighborhood, activeId, allTypes, allLinkTypes, onNavigate])

  useEffect(() => { render() }, [render])

  return (
    <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(ellipse at center, #1a2535 0%, #0d1117 100%)', overflow: 'hidden' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {neighborhood && (
        <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 12, opacity: 0.45, fontSize: 10, color: '#8aa', pointerEvents: 'none', userSelect: 'none' }}>
          <span>● parent (above)</span>
          <span>● child (below)</span>
          <span style={{ color: '#f0a500' }}>● jump (left)</span>
          <span style={{ color: '#7cd' }}>● sibling (right)</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>· drag gate to link</span>
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
