use axum::http::{HeaderValue, Method};
use tower_http::cors::{AllowOrigin, CorsLayer};

mod commands;
mod models;
mod router;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let allowed_origins = [
        //[!!!] ADD HERE ANOTHER ORIGIN
        "https://julapalula.github.io".parse::<HeaderValue>().unwrap(),
        "http://localhost:5173".parse::<HeaderValue>().unwrap(),
    ];

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(allowed_origins))
        .allow_methods([Method::GET]);

    let app = router::router().layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    println!("Backend listening on http://0.0.0.0:3001");
    println!("eBird token: {}", if commands::ebird_token().is_empty() { "NOT SET (set EBIRD_TOKEN env var)" } else { "OK" });
    axum::serve(listener, app).await.unwrap();
}
