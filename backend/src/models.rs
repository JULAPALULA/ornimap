use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Community {
    pub id: String,
    pub name: String,
    pub ebird_code: String,
    pub lat: f64,
    pub lon: f64,
}

pub fn communities() -> Vec<Community> {
    serde_json::from_str(include_str!("../communities.json")).expect("communities.json is invalid")
}

#[derive(Debug, Deserialize)]
pub struct EbirdObs {
    #[serde(rename = "comName")]
    pub com_name: Option<String>,
    #[serde(rename = "sciName")]
    pub sci_name: Option<String>,
    #[serde(rename = "locName")]
    pub loc_name: Option<String>,
    #[serde(rename = "obsDt")]
    pub obs_dt: Option<String>,
    #[serde(rename = "howMany")]
    pub how_many: Option<u32>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct ObsPoint {
    pub lat: f64,
    pub lon: f64,
    pub com_name: Option<String>,
    pub sci_name: Option<String>,
    pub loc_name: Option<String>,
    pub date: Option<String>,
    pub count: Option<u32>,
}

pub fn to_point(obs: &EbirdObs) -> Option<ObsPoint> {
    let lat = obs.lat?;
    let lon = obs.lng?;
    let date = obs.obs_dt.as_ref().map(|d| d.chars().take(10).collect());
    Some(ObsPoint {
        lat,
        lon,
        com_name: obs.com_name.clone(),
        sci_name: obs.sci_name.clone(),
        loc_name: obs.loc_name.clone(),
        date,
        count: obs.how_many,
    })
}

#[derive(Deserialize)]
pub struct ObsQuery {
    pub back: Option<u32>,
}
