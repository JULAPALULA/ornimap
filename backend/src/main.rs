use axum::http::Method;
use tower_http::cors::{Any, CorsLayer};

mod commands;
mod models;
mod router;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET]);

    let app = router::router().layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    println!("Backend listening on http://0.0.0.0:3001");
    println!("eBird token: {}", if commands::ebird_token().is_empty() { "NOT SET (set EBIRD_TOKEN env var)" } else { "OK" });
    axum::serve(listener, app).await.unwrap();
}
