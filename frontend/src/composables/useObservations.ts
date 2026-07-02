/*
 * Reactive state and fetch logic for eBird observation data.
 *
 * Data flow
 * ============================================================
 * onMounted
 * -> fetchCommunities()  ->  GET /api/communities  ->  communities[]
 * -> fetchObservations() ->  GET /api/all_observations?back=N  ->  allPoints[]
 *
 * User selects period
 * -> selectPeriod(days)  ->  updates daysBack, re-fetches allPoints[]
 *
 * Public API
 * ============================================================
 * communities   ->  Ref<Community[]>  static list of Spanish regions
 * allPoints     ->  Ref<ObsPoint[]>   raw observation points (all of Spain)
 * loadingAll    ->  Ref<boolean>      true while a fetch is in flight
 * errorAll      ->  Ref<string>       last error message, empty on success
 * daysBack      ->  Ref<number>       current look-back window (1-30)
 *
 * fetchCommunities()       ->  populates `communities`
 * fetchObservations()      ->  populates `allPoints` for the current daysBack
 * selectPeriod(days)       ->  sets daysBack and triggers fetchObservations
 */

import { ref } from 'vue'
import type { Community, ObsPoint } from '../types'

/** Base URL of the Rust/Axum backend.
 *  Set VITE_API_BASE in your environment or in the GitHub Actions variable
 *  VITE_API_BASE to point at the deployed backend for production builds.
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:3001'

export function useObservations() {
  const communities = ref<Community[]>([])
  const allPoints = ref<ObsPoint[]>([])
  const loadingAll = ref(false)
  const errorAll = ref('')
  const daysBack = ref(14)

  /**
   * Fetches the static list of Spanish autonomous communities from the backend.
   * Called once on mount; the list never changes at runtime.
   */
  async function fetchCommunities(): Promise<void> {
    const res = await fetch(`${API_BASE}/api/communities`)
    communities.value = await res.json() as Community[]
  }

  /**
   * Fetches recent bird observations for all of Spain.
   * Uses the current value of `daysBack` as the look-back window.
   *
   * On success: populates `allPoints`.
   * On API error: stores the error message in `errorAll`.
   * On network error: stores a connection error in `errorAll`.
   */
  async function fetchObservations(): Promise<void> {
    loadingAll.value = true
    errorAll.value = ''
    try {
      const res = await fetch(`${API_BASE}/api/all_observations?back=${daysBack.value}`)
      const data = await res.json() as { error?: string; points?: ObsPoint[] }
      if (data.error) errorAll.value = data.error
      else allPoints.value = data.points ?? []
    } catch (e) {
      errorAll.value = `Sin conexión al backend: ${e}`
    } finally {
      loadingAll.value = false
    }
  }

  /**
   * Updates the look-back period and immediately re-fetches observations.
   * Called when the user clicks one of the period buttons in the header.
   */
  function selectPeriod(days: number): void {
    daysBack.value = days
    fetchObservations()
  }

  return { communities, allPoints, loadingAll, errorAll, daysBack, fetchCommunities, fetchObservations, selectPeriod }
}
