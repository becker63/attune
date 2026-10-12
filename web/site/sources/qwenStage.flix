// Source: attune/src/Attune/../../test/localization_qwen/QwenStages.flix:157–161
// Source SHA-256: bd55de33c028b2168faafcae8e83a4e476eaa6d7d77bcfa95f0f918b97f7308e
def rankStage(): Unit \ {Assert, IO} = {
    let dir = outputsDir();
    let taskId = stripPrefix("rank_q_", stageLabel());
    let declaredRows = declaredFixtureRows();
    let queryRows = List.filter(row -> row#side == "query", declaredRows);
