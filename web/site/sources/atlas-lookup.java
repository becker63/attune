    static String evidenceText(String path, WorldEvidence ev) {
        List<String> defs = ev.defines.getOrDefault(path, new ArrayList<>());
        List<String> imps = ev.imports.getOrDefault(path, new ArrayList<>());
        List<String> importers = ev.importedBy.getOrDefault(path, new ArrayList<>());
        List<String> tids = new ArrayList<>();
        for (String symbol : defs) {
            for (String tid : ev.witnessTids.getOrDefault(symbol, new ArrayList<>())) {
                if (!tids.contains(tid)) {
                    tids.add(tid);
                }
            }
        }
        StringBuilder sb = new StringBuilder();
