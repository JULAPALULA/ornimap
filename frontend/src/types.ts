/*
 * Shared domain types used across composables and the App component.
 *
 * Community  ->  a Spanish autonomous community (static, loaded from the backend)
 * ObsPoint   ->  a single eBird observation mapped to a map coordinate
 */

/**
 * A Spanish autonomous community as returned by GET /api/communities.
 *
 * Fields:
 *   id         ->  our stable slug (e.g. "andalucia")
 *   name       ->  display name in Spanish (e.g. "Andalucía")
 *   ebird_code ->  eBird subnational1 region code (e.g. "ES-AN")
 *   lat / lon  ->  approximate centroid used for map positioning
 */
export interface Community {
  id: string
  name: string
  ebird_code: string
  lat: number
  lon: number
}

/**
 * A single bird observation returned by the eBird API, projected to the
 * fields the frontend actually uses for map pins and chart aggregation.
 *
 * Fields:
 *   lat / lon   ->  WGS-84 coordinates of the observation location
 *   com_name    ->  common name (English), null if eBird did not provide one
 *   sci_name    ->  scientific name, used as fallback when com_name is null
 *   loc_name    ->  human-readable location string shown in the pin tooltip
 *   date        ->  ISO date string "YYYY-MM-DD" (time part stripped)
 *   count       ->  number of individuals reported; null means "not counted"
 */
export interface ObsPoint {
  lat: number
  lon: number
  com_name: string | null
  sci_name: string | null
  loc_name: string | null
  date: string | null
  count: number | null
}
