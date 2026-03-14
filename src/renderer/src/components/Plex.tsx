import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type { Thought, Neighborhood } from '../../../shared/types'

interface PlexNode {
  id: string; title: string; color: string
  role: 'active' | 'parent' | 'child' | 'jump'
  x: number; y: number; targetX: number; targetY: number
}
interface PlexLink { sourceId: string; targetId: string; type: 'child' | 'jump' }
interface PlexProps {
  neighborhood: Neighborhood | null; activeId: string | null
  onNavigate: (id: string) => void; onCreateChild: () => void
}

const NODE_R = 36, ACTIVE_R = 52, PY = 190, CY = 190, JX = 260, SPREAD = 160, DUR = 500

function layout(n: Neighborhood, cx: number, cy: number) {
  const nodes: PlexNode[] = []
  const push = (t: Thought, role: PlexNode['role'], tx: number, ty: number) =>
    nodes.push({ id: t.id, title: t.title, color: t.color, role, x: tx, y: ty, targetX: tx, targetY: ty })

  push(n.thought, 'active', cx, cy)
  n.parents.forEach((p, i) => push(p, 'parent', cx + (n.parents.length === 1 ? 0 : (i - (n.parents.length-1)/2) * SPREAD), cy - PY))
  n.children.forEach((c, i) => push(c, 'child', cx + (n.children.length === 1 ? 0 : (i - (n.children.length-1)/2) * SPREAD), cy + CY))
  n.jumps.forEach((j, i) => push(j, 'jump', cx + JX, cy + (n.jumps.length === 1 ? 0 : (i - (n.jumps.length-1)/2) * SPREAD)))

  return { nodes, links: n.links.map(l => ({ sourceId: l.source_id, targetId: l.target_id, type: l.type })) }
}

const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n-1) + '…' : s

export function Plex({ neighborhood, activeId, onNavigate, onCreateChild }: PlexProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement | null>(null)
  const sizeRef = useRef({ w: 900, h: 600 })

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const g = svg.append('g').attr('class', 'plex-root')
    gRef.current = g.node()
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 3]).on('zoom', e => g.attr('transform', e.transform)))
    svg.on('dblclick.zoom', null)
  }, [])

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
    const { nodes, links } = layout(neighborhood, w / 2, h / 2)
    const nm = new Map(nodes.map(n => [n.id, n]))

    // links
    const lSel = g.selectAll<SVGPathElement, PlexLink>('path.pl').data(links, d => `${d.sourceId}-${d.targetId}`)
    const lEnter = lSel.enter().append('path').attr('class', 'pl').attr('fill', 'none').attr('stroke-width', 1.5).attr('opacity', 0)
    const lMerge = lEnter.merge(lSel)
    lMerge.attr('stroke', d => d.type === 'jump' ? '#f0a500' : '#5a7fa0').attr('stroke-dasharray', d => d.type === 'jump' ? '6,3' : 'none')
    lMerge.transition().duration(DUR).ease(d3.easeCubicInOut).attr('opacity', 1)
      .attr('d', d => { const s = nm.get(d.sourceId), t = nm.get(d.targetId); if (!s || !t) return ''; const mx = (s.targetX+t.targetX)/2, my = (s.targetY+t.targetY)/2, c = Math.abs(s.targetY-t.targetY) < 10 ? 40 : 0; return `M${s.targetX},${s.targetY} Q${mx},${my+c} ${t.targetX},${t.targetY}` })
    lSel.exit().transition().duration(DUR/2).attr('opacity', 0).remove()

    // nodes
    const nSel = g.selectAll<SVGGElement, PlexNode>('g.pn').data(nodes, d => d.id)
    const nEnter = nSel.enter().append('g').attr('class', 'pn').attr('cursor', 'pointer')
      .attr('transform', d => `translate(${d.x},${d.y})`).attr('opacity', 0)
    nEnter.append('circle').attr('r', d => d.role === 'active' ? ACTIVE_R : NODE_R)
      .attr('fill', d => d.color)
      .attr('stroke', d => d.role === 'active' ? '#fff' : 'rgba(255,255,255,0.25)')
      .attr('stroke-width', d => d.role === 'active' ? 3 : 1.5)
      .style('filter', d => d.role === 'active' ? 'drop-shadow(0 0 12px rgba(255,255,255,0.4))' : 'none')
    nEnter.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('fill', '#fff')
      .attr('font-size', d => d.role === 'active' ? 13 : 11).attr('font-weight', d => d.role === 'active' ? '600' : '400')
      .attr('pointer-events', 'none').text(d => trunc(d.title, d.role === 'active' ? 14 : 12))
    nEnter.append('text').attr('class', 'rl').attr('text-anchor', 'middle')
      .attr('dy', d => d.role === 'parent' ? -NODE_R - 8 : NODE_R + 16)
      .attr('fill', 'rgba(200,210,230,0.5)').attr('font-size', 9).attr('pointer-events', 'none')
    nEnter.on('click', (_, d) => { if (d.id !== activeId) onNavigate(d.id) })

    const nMerge = nEnter.merge(nSel)
    nMerge.select<SVGTextElement>('text.rl').text(d => d.role === 'parent' ? 'parent' : d.role === 'jump' ? 'jump' : '')
    nMerge.select('circle')
      .attr('r', d => d.role === 'active' ? ACTIVE_R : NODE_R)
      .attr('stroke', d => d.role === 'active' ? '#fff' : 'rgba(255,255,255,0.25)')
      .attr('stroke-width', d => d.role === 'active' ? 3 : 1.5)
      .style('filter', d => d.role === 'active' ? 'drop-shadow(0 0 12px rgba(255,255,255,0.4))' : 'none')
    nMerge.select('text:not(.rl)').text(d => trunc(d.title, d.role === 'active' ? 14 : 12))
    nMerge.transition().duration(DUR).ease(d3.easeCubicInOut).attr('opacity', 1)
      .attr('transform', d => `translate(${d.targetX},${d.targetY})`)
    nSel.exit().transition().duration(DUR/2).attr('opacity', 0).remove()

    nMerge.on('mouseenter', function(_, d) {
      if (d.role === 'active') return
      d3.select(this).select('circle').transition().duration(150).attr('stroke', '#fff').attr('stroke-width', 2.5)
    }).on('mouseleave', function(_, d) {
      if (d.role === 'active') return
      d3.select(this).select('circle').transition().duration(150).attr('stroke', 'rgba(255,255,255,0.25)').attr('stroke-width', 1.5)
    })
  }, [neighborhood, activeId, onNavigate])

  useEffect(() => { render() }, [render])

  return (
    <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(ellipse at center, #1e2a3a 0%, #0d1117 100%)', overflow: 'hidden' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {!neighborhood && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 15, gap: 12, userSelect: 'none' }}>
          <div style={{ fontSize: 48 }}>🧠</div>
          <div>No thoughts yet.</div>
          <div style={{ fontSize: 13 }}>Press ⌘N or click "+ New Thought" to begin.</div>
        </div>
      )}
      {neighborhood && (
        <button onClick={onCreateChild} style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(74,144,226,0.85)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}>
          + Add child thought
        </button>
      )}
    </div>
  )
}
