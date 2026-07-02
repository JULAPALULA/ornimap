/*
 * Leaflet map initialisation, pin rendering, and polygon overlay.
 *
 * Layer model
 * ============================================================
 * TileLayer  (OpenStreetMap, permanent)
 *   -> pinsLayer    LayerGroup  rebuilt on every data/community change
 *   -> polygonLayer GeoJSON     the selected community border; null when none
 *
 * Pin colours
 * ============================================================
 * PIN_COLOR      ->  all observations when no community is selected
 * PIN_HIGHLIGHT  ->  observations inside the selected community
 * (dimmed blue)  ->  observations outside the selected community
 *
 * Public API
 * ============================================================
 * initMap(elementId)
 *   Creates the Leaflet map in the DOM element with the given id.
 *   Must be called inside onMounted after the element exists.
 *
 * redrawPins(allPoints, selectedFeature)
 *   Clears and redraws all observation pins.
 *   Pins inside `selectedFeature` are highlighted in red; the rest are blue.
 *
 * redrawPolygon(selectedFeature)
 *   Draws the community border polygon and pans/zooms to fit it.
 *   Pass null to remove the current polygon without drawing a new one.
 */

import L from 'leaflet'
import type { Map as LMap, LayerGroup, GeoJSON as LGeoJSON } from 'leaflet'
import type { Feature } from 'geojson'
import type { ObsPoint } from '../types'
import { pointInGeometry } from '../utils/geo'

/** Default pin colour: used for all points when no community is selected. */
const PIN_COLOR = '#2980b9'

/** Highlight colour: used for pins inside the selected community. */
const PIN_HIGHLIGHT = '#e74c3c'

export function useMap() {
  let map: LMap | null = null
  let pinsLayer: LayerGroup | null = null
  let polygonLayer: LGeoJSON | null = null

  /**
   * Initialises the Leaflet map inside the element identified by `elementId`.
   * Sets the initial view to the centre of mainland Spain at zoom 6.
   */
  function initMap(elementId: string): void {
    map = L.map(elementId).setView([40.2, -3.5], 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
  }

  /**
   * Clears the current pins layer and redraws one circle marker per observation.
   *
   * When `selectedFeature` is set, each pin is tested with pointInGeometry:
   *   inside  -> larger radius, red fill, full opacity
   *   outside -> smaller radius, blue fill, low opacity
   *
   * When `selectedFeature` is null all pins are rendered in the same blue style.
   */
  function redrawPins(allPoints: ObsPoint[], selectedFeature: Feature | null): void {
    if (!map) return
    if (pinsLayer) { pinsLayer.remove(); pinsLayer = null }
    pinsLayer = L.layerGroup().addTo(map)

    for (const p of allPoints) {
      const highlighted = selectedFeature
        ? pointInGeometry(p.lon, p.lat, selectedFeature.geometry)
        : false

      L.circleMarker([p.lat, p.lon], {
        radius: highlighted ? 6 : 4,
        color: highlighted ? PIN_HIGHLIGHT : PIN_COLOR,
        fillColor: highlighted ? PIN_HIGHLIGHT : PIN_COLOR,
        fillOpacity: highlighted ? 0.9 : 0.4,
        weight: 1,
      })
        .bindTooltip(
          `<strong>${p.com_name || p.sci_name || '?'}</strong><br>${p.loc_name || ''}<br>${p.date || ''}${p.count ? ' · ' + p.count + ' ind.' : ''}`,
          { direction: 'top' }
        )
        .addTo(pinsLayer)
    }
  }

  /**
   * Replaces the community polygon overlay with the one derived from `selectedFeature`.
   * After drawing, the map viewport is fitted to the polygon bounds with 30 px padding.
   * Passing null removes the existing polygon without drawing a new one.
   */
  function redrawPolygon(selectedFeature: Feature | null): void {
    if (!map) return
    if (polygonLayer) { polygonLayer.remove(); polygonLayer = null }
    if (!selectedFeature) return
    polygonLayer = L.geoJSON(selectedFeature, {
      style: { color: '#2c3e50', weight: 2.5, fillColor: '#3498db', fillOpacity: 0.08 },
    }).addTo(map)
    map.fitBounds(polygonLayer.getBounds(), { padding: [30, 30] })
  }

  return { initMap, redrawPins, redrawPolygon }
}
