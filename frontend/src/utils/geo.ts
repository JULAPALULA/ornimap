/*
 * Pure geometry utilities for point-in-polygon testing.
 *
 * Used to decide which observations fall inside the selected community
 * so the sidebar statistics and chart reflect only local sightings.
 *
 * Public API
 * ============================================================
 * nameToId
 *   Maps GeoJSON feature names (as they appear in spain-communities.geojson)
 *   to our internal community slugs.
 *
 * pointInRing(lon, lat, ring) -> boolean
 *   Ray-casting test against a single polygon ring.
 *
 * pointInGeometry(lon, lat, geometry) -> boolean
 *   Dispatches to pointInRing for both Polygon and MultiPolygon geometries.
 */

import type { Geometry } from 'geojson'

/**
 * Lookup table from GeoJSON feature name to our community id slug.
 * The keys come from the `name` property inside spain-communities.geojson;
 * the values match the `id` field of the Community interface.
 */
export const nameToId: Record<string, string> = {
  'Andalucia': 'andalucia', 'Aragon': 'aragon', 'Asturias': 'asturias',
  'Baleares': 'baleares', 'Canarias': 'canarias', 'Cantabria': 'cantabria',
  'Castilla-La Mancha': 'castilla_la_mancha', 'Castilla-Leon': 'castilla_y_leon',
  'Cataluña': 'cataluna', 'Ceuta': 'ceuta', 'Extremadura': 'extremadura',
  'Galicia': 'galicia', 'Madrid': 'madrid', 'Melilla': 'melilla',
  'Murcia': 'murcia', 'Navarra': 'navarra', 'Pais Vasco': 'pais_vasco',
  'La Rioja': 'rioja', 'Valencia': 'valencia',
}

/**
 * Ray-casting algorithm: returns true if the point (lon, lat) lies inside
 * the closed polygon ring.
 *
 * A horizontal ray is cast from the point to the right; each time it
 * crosses an edge of the ring the `inside` flag is toggled. An odd number
 * of crossings means the point is inside.
 *
 * Args:
 *   lon   ->  longitude of the point to test
 *   lat   ->  latitude of the point to test
 *   ring  ->  array of [lon, lat] vertex pairs forming the ring
 */
export function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!
    const [xj, yj] = ring[j]!
    if ((yi! > lat) !== (yj! > lat) && lon < ((xj! - xi!) * (lat - yi!)) / (yj! - yi!) + xi!)
      inside = !inside
  }
  return inside
}

/**
 * Returns true if the point (lon, lat) falls inside the given GeoJSON geometry.
 * Only Polygon and MultiPolygon are handled; all other geometry types return false.
 *
 * For MultiPolygon the point is tested against the outer ring of each
 * sub-polygon, the first match short-circuits the search.
 */
export function pointInGeometry(lon: number, lat: number, geometry: Geometry): boolean {
  if (geometry.type === 'Polygon') return pointInRing(lon, lat, geometry.coordinates[0] as number[][])
  if (geometry.type === 'MultiPolygon')
    return geometry.coordinates.some((p) => pointInRing(lon, lat, p[0] as number[][]))
  return false
}
