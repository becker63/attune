// /home/becker/projects/attune/attune/platform/support/grit/lib.rs:197–251
fn run(language: &[u8], program: &[u8], path: &[u8], source: &[u8]) -> Vec<u8> {
    let language = match text(language, "language") {
        Ok(value) => value,
        Err(error) => return error,
    };
    let path = match text(path, "path") {
        Ok(value) => value,
        Err(error) => return error,
    };
    let source = match text(source, "source") {
        Ok(value) => value,
        Err(error) => return error,
    };
    let key = (language.clone(), program.to_vec());
    let input_key = (path.clone(), source.clone());

    if let Some(bytes) = lock(&EVALUATIONS)
        .get(&key)
        .and_then(|inputs| inputs.get(&path))
        .and_then(|(cached_source, bytes)| {
            if cached_source == &source {
                Some(bytes.clone())
            } else {
                None
            }
        })
    {
        return bytes;
    }

    let mut problems = lock(&PROBLEMS);
    if !problems.contains_key(&key) {
        let problem = match compile(&language, program) {
            Ok(value) => value,
            Err(error) => return error,
        };
        problems.insert(key.clone(), problem);
        record_compile(&key);
    }
    let bytes = match problems.get(&key) {
        Some(problem) => {
            record_execute(&key, &input_key);
            execute(problem, path, source)
        }
        None => failure("host", "compiled Grit program disappeared"),
    };
    drop(problems);
    lock(&EVALUATIONS)
        .entry(key)
        .or_default()
        .insert(input_key.0, (input_key.1, bytes.clone()));
    bytes
}

unsafe fn input<'a>(data: *const u8, len: usize) -> Result<&'a [u8], Vec<u8>> {
