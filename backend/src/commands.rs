/*
 * eBird observation handlers.
 *
 * ============================================================
 * Frontend
 * -> GET /api/communities           -> list of Spanish regions
 * -> GET /api/all_observations      -> recent sightings across Spain (ES)
 * -> GET /api/observations/{region} -> per-region species breakdown
 *
 * Public API
 * ============================================================
 * get_communities() -> Json<Value>
 *   Returns the static list of Spanish autonomous communities with
 *   their eBird region codes and coordinates.
 *
 * get_all_observations(?back=N) -> Json<Value>
 *   Returns up to 10 000 recent observation points for all of Spain.
 *   `back` = days to look back (1-30, default 14).
 *
 * get_species_list(region) -> Json<Value>
 *   Returns per-species statistics and observation points for a
 *   single community. `region` may be the community id or eBird code.
 */

use axum::{extract::Query, Json};
use std::collections::HashMap;

use crate::models::{communities, to_point, EbirdObs, ObsPoint, ObsQuery};

/** Base URL for all eBird v2 API calls. */
const EBIRD_BASE: &str = "https://api.ebird.org/v2";

/**
 * Reads the eBird API token from the environment.
 * Prints a warning and returns an empty string if the variable is not set.
 */
pub fn ebird_token() -> String {
    std::env::var("EBIRD_TOKEN").unwrap_or_else(|_| {
        eprintln!("WARNING: EBIRD_TOKEN env var not set");
        String::new()
    })
}

/**
 * Fetches recent observations from the eBird v2 API for a given region.
 *
 * Args:
 *   region      ->  eBird subnational1 code (e.g. "ES-AN") or "ES" for all Spain
 *   back        ->  number of days to look back (1-30)
 *   max_results ->  maximum number of records to return
 *
 * Returns:
 *   Ok(Vec<EbirdObs>) ->  raw observation records from eBird
 *   Err(String)       ->  HTTP error, network error, or JSON parse failure
 */
async fn ebird_recent(
    client: &reqwest::Client,
    region: &str,
    back: u32,
    max_results: u32,
) -> Result<Vec<EbirdObs>, String> {
    let url = format!(
        "{}/data/obs/{}/recent?back={}&maxResults={}&includeProvisional=true",
        EBIRD_BASE, region, back, max_results
    );

    let resp = client
        .get(&url)
        .header("X-eBirdApiToken", ebird_token())
        .send()
        .await
        .map_err(|e| format!("eBird request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("eBird HTTP {}: {}", status, &body[..body.len().min(300)]));
    }

    resp.json::<Vec<EbirdObs>>()
        .await
        .map_err(|e| format!("eBird parse failed: {}", e))
}

/**
 * GET /api/communities
 *
 * Returns the static list of Spanish autonomous communities loaded
 * from communities.json, serialised directly as a JSON array.
 */
pub async fn get_communities() -> Json<serde_json::Value> {
    Json(serde_json::json!(communities()))
}

/**
 * GET /api/all_observations?back=N
 *
 * Fetches up to 10 000 recent observation points for all of Spain (region "ES").
 * The `back` query parameter controls how many days to look back (clamped 1-30).
 *
 * Response shape:
 *   { "points": [ ObsPoint, ... ] }
 *   { "error":  "..." }   on failure
 */
pub async fn get_all_observations(Query(params): Query<ObsQuery>) -> Json<serde_json::Value> {
    let back = params.back.unwrap_or(14).clamp(1, 30);

    let client = reqwest::Client::builder()
        .build()
        .unwrap();

    match ebird_recent(&client, "ES", back, 10000).await {
        Err(e) => Json(serde_json::json!({ "error": e })),
        Ok(obs) => {
            // Drop records with no coordinates, they cannot be plotted on the map.
            let points: Vec<ObsPoint> = obs.iter().filter_map(to_point).collect();
            Json(serde_json::json!({ "points": points }))
        }
    }
}

/**
 * GET /api/observations/{region}
 *
 * Returns a species breakdown and all observation points for a single
 * autonomous community. `region` is matched against both the community
 * id (e.g. "andalucia") and the eBird code (e.g. "ES-AN").
 *
 * Response shape (success):
 *   {
 *     "community":          string,
 *     "total_observations": number,
 *     "points":             ObsPoint[],
 *     "species":            [{ name, obs, individuals }, ...],  // top 50
 *     "by_date":            { "YYYY-MM-DD": count, ... }
 *   }
 */
pub async fn get_species_list(
    axum::extract::Path(region): axum::extract::Path<String>,
) -> Json<serde_json::Value> {
    let comms = communities();
    let comm = match comms.iter().find(|c| c.ebird_code == region || c.id == region) {
        Some(c) => c.clone(),
        None => return Json(serde_json::json!({ "error": "unknown region" })),
    };

    let client = reqwest::Client::builder()
        .build()
        .unwrap();

    match ebird_recent(&client, &comm.ebird_code, 30, 10000).await {
        Err(e) => Json(serde_json::json!({ "error": e })),
        Ok(obs) => {
            let points: Vec<ObsPoint> = obs.iter().filter_map(to_point).collect();

            // Aggregate per species: (observation_count, individual_count).
            let mut by_species: HashMap<String, (u32, u32)> = HashMap::new();
            // Aggregate per date: observation_count.
            let mut by_date: HashMap<String, u32> = HashMap::new();

            for p in &points {
                let name = p.com_name.clone()
                    .or_else(|| p.sci_name.clone())
                    .unwrap_or_else(|| "Unknown".into());
                let e = by_species.entry(name).or_insert((0, 0));
                e.0 += 1;
                e.1 += p.count.unwrap_or(1);
                if let Some(d) = &p.date {
                    *by_date.entry(d.clone()).or_insert(0) += 1;
                }
            }

            // Sort by observation count descending; keep only the top 50 species.
            let mut species: Vec<serde_json::Value> = by_species
                .into_iter()
                .map(|(name, (obs, ind))| serde_json::json!({ "name": name, "obs": obs, "individuals": ind }))
                .collect();
            species.sort_by(|a, b| b["obs"].as_u64().cmp(&a["obs"].as_u64()));
            species.truncate(50);

            Json(serde_json::json!({
                "community": comm.name,
                "total_observations": points.len(),
                "points": points,
                "species": species,
                "by_date": by_date,
            }))
        }
    }
}
