import { ref, computed, watch, nextTick, onMounted, type Ref } from 'vue'
import type { Feature, FeatureCollection } from 'geojson'
import { nameToId, pointInGeometry } from './utils/geo'
import { useObservations } from './composables/useObservations'
import { useMap } from './composables/useMap'
import { useCharts } from './composables/useCharts'

export const periodOptions = [
  { label: '7 días',  value: 7  },
  { label: '14 días', value: 14 },
  { label: '30 días', value: 30 },
]

export function useAppSetup(
  speciesChartEl: Ref<HTMLCanvasElement | null>,
  dateChartEl: Ref<HTMLCanvasElement | null>,
  countChartEl: Ref<HTMLCanvasElement | null>,
) {
  const { communities, allPoints, loadingAll, errorAll, daysBack, fetchCommunities, fetchObservations, selectPeriod } = useObservations()
  const { initMap, redrawPins, redrawPolygon } = useMap()
  const { renderCharts } = useCharts(speciesChartEl, dateChartEl, countChartEl)

  const selectedId = ref('')
  /** Committed species filter, set only via selectSpeciesOption()/clearSpecies() — mirrors selectedId's role for the community <select>. */
  const selectedSpecies = ref('')
  /** Live text in the species search box; independent from selectedSpecies while the dropdown is open. */
  const speciesQuery = ref('')
  const speciesOpen = ref(false)
  let geojsonData: FeatureCollection | null = null

  const speciesName = (p: { com_name: string | null; sci_name: string | null }): string =>
    p.com_name || p.sci_name || 'Desconocida'

  const selectedFeature = computed<Feature | null>(() => {
    if (!selectedId.value || !geojsonData) return null
    return geojsonData.features.find((f) => nameToId[f.properties?.name] === selectedId.value) ?? null
  })

  const selectedCommunity = computed(() =>
    communities.value.find((c) => c.id === selectedId.value) ?? null
  )

  /** Sorted list of unique species names across all fetched observations, for the searchable species picker. */
  const speciesList = computed(() =>
    Array.from(new Set(allPoints.value.map(speciesName))).sort((a, b) => a.localeCompare(b))
  )

  /** Species list narrowed down by whatever the user has typed in the search box, shown in the dropdown. */
  const filteredSpeciesOptions = computed(() => {
    const q = speciesQuery.value.trim().toLowerCase()
    if (!q) return speciesList.value
    return speciesList.value.filter((s) => s.toLowerCase().includes(q))
  })

  const speciesFilteredPoints = computed(() =>
    selectedSpecies.value
      ? allPoints.value.filter((p) => speciesName(p) === selectedSpecies.value)
      : allPoints.value
  )

  const filteredPoints = computed(() => {
    if (selectedFeature.value) {
      const geom = selectedFeature.value.geometry
      return speciesFilteredPoints.value.filter((p) => pointInGeometry(p.lon, p.lat, geom))
    }
    return selectedSpecies.value ? speciesFilteredPoints.value : []
  })

  const speciesCount = computed(() =>
    new Set(filteredPoints.value.map((p) => p.com_name || p.sci_name).filter(Boolean)).size
  )

  const totalIndividuals = computed(() =>
    filteredPoints.value.reduce((sum, p) => sum + (p.count ?? 1), 0)
  )

  function updateView(): void {
    redrawPolygon(selectedFeature.value)
    redrawPins(speciesFilteredPoints.value, selectedFeature.value)
    if (filteredPoints.value.length) nextTick(() => renderCharts(filteredPoints.value))
  }

  function onCommunitySelect(): void {
    updateView()
  }

  function openSpeciesDropdown(): void {
    speciesOpen.value = true
  }

  /** Closes the dropdown and snaps the search box text back to the committed selection. */
  function closeSpeciesDropdown(): void {
    speciesOpen.value = false
    speciesQuery.value = selectedSpecies.value
  }

  function selectSpeciesOption(name: string): void {
    selectedSpecies.value = name
    speciesQuery.value = name
    speciesOpen.value = false
    updateView()
  }

  function clearSpecies(): void {
    selectedSpecies.value = ''
    speciesQuery.value = ''
    speciesOpen.value = false
    updateView()
  }

  watch(filteredPoints, (pts) => {
    if (pts.length && (selectedId.value || selectedSpecies.value)) nextTick(() => renderCharts(pts))
  })

  onMounted(async () => {
    initMap('map')

    const [, geoRes] = await Promise.all([
      fetchCommunities(),
      fetch(`${import.meta.env.BASE_URL}spain-communities.geojson`),
    ])
    geojsonData = await geoRes.json() as FeatureCollection

    await fetchObservations()
    redrawPins(allPoints.value, null)
  })

  return {
    communities, allPoints, loadingAll, errorAll, daysBack, selectPeriod,
    selectedId, selectedCommunity, filteredPoints, speciesCount, totalIndividuals,
    onCommunitySelect, speciesQuery, selectedSpecies, speciesOpen, filteredSpeciesOptions,
    openSpeciesDropdown, closeSpeciesDropdown, selectSpeciesOption, clearSpecies,
  }
}
