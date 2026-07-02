use axum::{routing::get, Router};

use crate::commands::{get_all_observations, get_communities, get_species_list};

pub fn router() -> Router {
    Router::new()
        .route("/api/communities", get(get_communities))
        .route("/api/all_observations", get(get_all_observations))
        .route("/api/observations/{region}", get(get_species_list))
}
