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
  let geojsonData: FeatureCollection | null = null

  const selectedFeature = computed<Feature | null>(() => {
    if (!selectedId.value || !geojsonData) return null
    return geojsonData.features.find((f) => nameToId[f.properties?.name] === selectedId.value) ?? null
  })

  const selectedCommunity = computed(() =>
    communities.value.find((c) => c.id === selectedId.value) ?? null
  )

  const filteredPoints = computed(() => {
    if (!selectedFeature.value) return []
    const geom = selectedFeature.value.geometry
    return allPoints.value.filter((p) => pointInGeometry(p.lon, p.lat, geom))
  })

  const speciesCount = computed(() =>
    new Set(filteredPoints.value.map((p) => p.com_name || p.sci_name).filter(Boolean)).size
  )

  const totalIndividuals = computed(() =>
    filteredPoints.value.reduce((sum, p) => sum + (p.count ?? 1), 0)
  )

  function onCommunitySelect(): void {
    redrawPolygon(selectedFeature.value)
    redrawPins(allPoints.value, selectedFeature.value)
    if (filteredPoints.value.length) nextTick(() => renderCharts(filteredPoints.value))
  }

  watch(filteredPoints, (pts) => {
    if (pts.length && selectedId.value) nextTick(() => renderCharts(pts))
  })

  onMounted(async () => {
    initMap('map')

    const [, geoRes] = await Promise.all([
      fetchCommunities(),
      fetch('/spain-communities.geojson'),
    ])
    geojsonData = await geoRes.json() as FeatureCollection

    await fetchObservations()
    redrawPins(allPoints.value, null)
  })

  return {
    communities, allPoints, loadingAll, errorAll, daysBack, selectPeriod,
    selectedId, selectedCommunity, filteredPoints, speciesCount, totalIndividuals,
    onCommunitySelect,
  }
}
