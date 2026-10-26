use super::*;
use serde_json::json;

fn setup(trigger: &str) -> (std::path::PathBuf, std::path::PathBuf) {
    let root = std::env::temp_dir().join(format!(
        "openhau-report-export-test-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let destination = root.join("reports");
    std::fs::create_dir_all(&destination).unwrap();
    report_files::configure(&root,json!({"directory":destination.display().to_string(),"trigger":trigger,"formats":["csv","html"]})).unwrap();
    (root, destination)
}

#[test]
fn report_trigger_deduplication_and_revisions_preserve_prior_files() {
    let (root, destination) = setup("close");
    let files =
        json!({"csv":"fictional;amount\r\n000001;10.00","html":"<!doctype html><p>Fictional</p>"});
    assert!(report_files::write(&root, "save", "2026-10", files.clone())
        .unwrap()
        .is_none());
    assert_eq!(std::fs::read_dir(&destination).unwrap().count(), 0);
    let first = report_files::write(&root, "close", "2026-10", files.clone())
        .unwrap()
        .unwrap();
    let second = report_files::write(&root, "close", "2026-10", files.clone())
        .unwrap()
        .unwrap();
    assert_eq!(first, second);
    assert_eq!(std::fs::read_dir(&destination).unwrap().count(), 1);
    let mut changed = files;
    changed["csv"] = json!("fictional;amount\r\n000001;11.00");
    let third = report_files::write(&root, "manual", "2026-10", changed)
        .unwrap()
        .unwrap();
    assert_ne!(first, third);
    assert!(
        std::fs::read_to_string(std::path::Path::new(&first).join("balances-2026-10.csv"))
            .unwrap()
            .ends_with("10.00")
    );
    assert!(std::path::Path::new(&third).join("complete.json").exists());
}

#[test]
fn report_payloads_cannot_change_formats_or_escape_the_destination() {
    let (root, destination) = setup("save");
    for period in ["../file", "2026-13", "2026-0é"] {
        assert!(report_files::write(&root, "save", period, json!({"csv":"x","html":"y"})).is_err());
    }
    assert!(report_files::write(
        &root,
        "save",
        "2026-10",
        json!({"../escape":"x","html":"y"})
    )
    .is_err());
    assert!(report_files::write(&root, "save", "2026-10", json!({"csv":99,"html":"y"})).is_err());
    assert_eq!(std::fs::read_dir(destination).unwrap().count(), 0);
}

#[test]
fn save_trigger_includes_closing_and_disabled_exports_create_nothing() {
    let (root, destination) = setup("save");
    assert!(
        report_files::write(&root, "close", "2026-10", json!({"csv":"x","html":"y"}))
            .unwrap()
            .is_some()
    );
    report_files::configure(
        &root,
        json!({"directory":null,"trigger":"save","formats":["csv"]}),
    )
    .unwrap();
    assert!(
        report_files::write(&root, "save", "2026-10", json!({"csv":"x"}))
            .unwrap()
            .is_none()
    );
    assert_eq!(std::fs::read_dir(destination).unwrap().count(), 1);
}
