/*
 * Chart.js chart management for the community statistics panel.
 *
 * Charts rendered (all destroyed and rebuilt on each renderCharts call)
 * ============================================================
 * speciesChart  ->  horizontal bar  top 15 species by observation count
 * dateChart     ->  vertical bar    observations per calendar day
 * countChart    ->  doughnut        group size distribution (# individuals)
 *
 * Group size buckets
 * ============================================================
 * 1 | 2–5 | 6–20 | 21–100 | >100 | nc (not counted / null)
 *
 * Canvas refs are owned by the component and passed in as parameters so that
 * vue-tsc can trace their usage via the template ref bindings.
 *
 * Public API
 * ============================================================
 * renderCharts(pts)
 *   Rebuilds all three charts from the given observation points.
 *   No-ops if pts is empty or the canvas elements are not yet mounted.
 */

import type { Ref } from 'vue'
import Chart from 'chart.js/auto'
import type { ObsPoint } from '../types'

export function useCharts(
  speciesChartEl: Ref<HTMLCanvasElement | null>,
  dateChartEl: Ref<HTMLCanvasElement | null>,
  countChartEl: Ref<HTMLCanvasElement | null>,
) {
  // Chart instances are kept so they can be destroyed before being recreated.
  let speciesChart: Chart | undefined
  let dateChart: Chart | undefined
  let countChart: Chart | undefined

  /**
   * Rebuilds all three charts from `pts`.
   * Each chart is destroyed before being recreated to avoid Canvas memory leaks.
   * Called inside nextTick to ensure the canvas elements are mounted.
   */
  function renderCharts(pts: ObsPoint[]): void {
    if (!pts.length || !speciesChartEl.value) return

    // Aggregate observations and individual counts per species name.
    const speciesMap = new Map<string, { obs: number; ind: number }>()
    for (const { com_name, sci_name, count } of pts) {
      const name = com_name || sci_name || 'Desconocida'
      const e = speciesMap.get(name) ?? { obs: 0, ind: 0 }
      e.obs++
      e.ind += count ?? 1
      speciesMap.set(name, e)
    }
    // Sort descending by observation count and keep the top 15.
    const top = [...speciesMap.entries()].sort((a, b) => b[1].obs - a[1].obs).slice(0, 15)

    speciesChart?.destroy()
    speciesChart = new Chart(speciesChartEl.value, {
      type: 'bar',
      data: {
        labels: top.map(([n]) => n),
        datasets: [{ label: 'Avistamientos', data: top.map(([, e]) => e.obs), backgroundColor: '#2980b9' }],
      },
      options: {
        indexAxis: 'y', // horizontal bars, species names fit better on the y-axis
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } },
      },
    })

    // Count observations per ISO date string, then sort chronologically.
    const byDate: Record<string, number> = {}
    for (const { date } of pts) {
      if (date) byDate[date] = (byDate[date] ?? 0) + 1
    }
    const dates = Object.keys(byDate).sort()

    dateChart?.destroy()
    dateChart = new Chart(dateChartEl.value!, {
      type: 'bar',
      data: {
        labels: dates,
        datasets: [{ label: 'Avistamientos', data: dates.map((d) => byDate[d]!), backgroundColor: '#27ae60', borderRadius: 3 }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 14 } } },
      },
    })

    // Classify each observation into one of six group-size buckets.
    const buckets: Record<string, number> = { '1': 0, '2–5': 0, '6–20': 0, '21–100': 0, '>100': 0, 'nc': 0 }
    for (const { count } of pts) {
      if (!count) { buckets['nc']!++; continue }
      if (count === 1)       buckets['1']!++
      else if (count <= 5)   buckets['2–5']!++
      else if (count <= 20)  buckets['6–20']!++
      else if (count <= 100) buckets['21–100']!++
      else                   buckets['>100']!++
    }

    countChart?.destroy()
    countChart = new Chart(countChartEl.value!, {
      type: 'doughnut',
      data: {
        labels: Object.keys(buckets),
        datasets: [{ data: Object.values(buckets), backgroundColor: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#bdc3c7'] }],
      },
      options: { plugins: { legend: { position: 'right' } } },
    })
  }

  return { renderCharts }
}
