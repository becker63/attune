//! One bounded source file, three fixed programs, no final-answer cache.
//! The parent owns timeouts. This subprocess is an isolation boundary, not a sandbox.
#[path = "lib.rs"]
mod engine;

use serde::Deserialize;
use serde_json::{Value, json};
use std::{
    fs,
    io::{self, Read, Write},
    time::{Instant, SystemTime, UNIX_EPOCH},
};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    path: String,
    source: String,
}

// Both deployment targets are 64-bit Linux. POSIX clock() reports process CPU
// in millionths of a second, independently of elapsed wall time.
unsafe extern "C" {
    fn clock() -> std::ffi::c_long;
}
fn millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

fn extract() -> Result<Value, Box<dyn std::error::Error>> {
    let start = millis();
    let cpu = unsafe { clock() };
    let mut input = Vec::new();
    io::stdin().take(1024 * 1024 + 1).read_to_end(&mut input)?;
    if input.len() > 1024 * 1024 {
        return Err("Input exceeds transport limit".into());
    }
    let input: Input = serde_json::from_slice(&input)?;
    if input.source.len() > 128 * 1024 || input.path.len() > 512 || input.path.contains('\0') {
        return Err("Source exceeds extraction bounds".into());
    }
    let language = match input
        .path
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "js" | "cjs" | "mjs" => "javascript",
        "jsx" => "jsx",
        "ts" | "cts" | "mts" => "typescript",
        "tsx" => "tsx",
        _ => return Err("Unsupported source language".into()),
    };
    let executable = std::env::current_exe()?;
    let directory = executable.parent().ok_or("Missing program directory")?;
    let mut observation = json!({"path": input.path, "source": input.source});
    let mut operations = Vec::new();
    for relation in ["defines", "imports", "calls"] {
        let program = fs::read(directory.join(relation).join(format!("{language}.grit")))?;
        let began = Instant::now();
        // Bypass the JVM ABI's memoization: every invocation performs real work.
        let problem = engine::compile(language, &program)
            .map_err(|bytes| String::from_utf8_lossy(&bytes).into_owned())?;
        let compile_ms = began.elapsed().as_secs_f64() * 1000.0;
        let began = Instant::now();
        let bytes = engine::execute(&problem, input.path.clone(), input.source.clone());
        let execute_ms = began.elapsed().as_secs_f64() * 1000.0;
        let value: Value = serde_json::from_slice(&bytes)?;
        if value.get("error").is_some() {
            return Err(value.to_string().into());
        }
        observation[relation] = Value::String(String::from_utf8(bytes)?);
        operations.push(
            json!({"relation": relation, "compileMs": compile_ms, "executeEnvelopeMs": execute_ms}),
        );
    }
    let rss = fs::read_to_string("/proc/self/status")?
        .lines()
        .find(|line| line.starts_with("VmHWM:"))
        .and_then(|line| line.split_whitespace().nth(1))
        .ok_or("Process RSS unavailable")?
        .parse::<u64>()?
        * 1024;
    Ok(json!({"observation": observation, "execution": {
        "worker": std::process::id(), "start": start, "end": millis(),
        "cpuMs": (unsafe { clock() } - cpu) as f64 / 1000.0,
        "rssBytes": rss, "operations": operations,
    }}))
}

fn main() {
    let value = match extract() {
        Ok(value) => value,
        Err(error) => json!({"error": error.to_string()}),
    };
    let bytes = serde_json::to_vec(&value).expect("JSON serialization");
    if bytes.len() > 2 * 1024 * 1024 {
        eprintln!("Output exceeds transport limit");
        std::process::exit(1);
    }
    io::stdout().write_all(&bytes).expect("stdout");
}
