// Presentation only. Reuses the shelf packing + fixed grids of Atlas Live's
// geometry.ts (AttuneFlix 1d47f1ea). Folder placement is not a structural score.
export function fileLayout(paths: string[]) {
  const folders = new Map<string, string[]>();
  for (const path of [...paths].sort()) {
    const folder = path.includes("/")
      ? path.slice(0, path.lastIndexOf("/"))
      : ".";
    folders.set(folder, [...(folders.get(folder) ?? []), path]);
  }
  const groups = [...folders]
    .map(([name, files]) => {
      const columns = Math.ceil(Math.sqrt(files.length));
      return {
        name,
        files,
        columns,
        w: columns * 150 + 48,
        h: Math.ceil(files.length / columns) * 100 + 66,
        x: 0,
        y: 0,
      };
    })
    .sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
  const limit = Math.max(
    ...groups.map((g) => g.w),
    Math.sqrt(groups.reduce((n, g) => n + (g.w + 30) * (g.h + 30), 0)),
  );
  let x = 0,
    y = 0,
    shelf = 0;
  for (const group of groups) {
    if (x && x + group.w > limit) {
      y += shelf + 30;
      x = 0;
      shelf = 0;
    }
    group.x = x;
    group.y = -y;
    x += group.w + 30;
    shelf = Math.max(shelf, group.h);
  }
  return {
    groups,
    nodes: groups.flatMap((g) =>
      g.files.map((path, i) => ({
        id: path,
        path,
        name: path.split("/").at(-1)!,
        x: g.x + 99 + (i % g.columns) * 150,
        y: g.y - 76 - Math.floor(i / g.columns) * 100,
      })),
    ),
  };
}
