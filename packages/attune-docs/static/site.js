const root = document.documentElement;
const basePath = root.dataset.basePath ?? "/";
const search = document.querySelector("#doc-search");
const results = document.querySelector("#search-results");
const sidebar = document.querySelector("#docs-sidebar");
const menu = document.querySelector(".menu-button");

let index = [];

const hideResults = () => {
  if (results instanceof HTMLElement) {
    results.hidden = true;
    results.replaceChildren();
  }
};

const showResults = (query) => {
  if (!(results instanceof HTMLElement)) return;
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized.length === 0) {
    hideResults();
    return;
  }
  const matches = index
    .map((entry) => {
      const title = entry.title.toLocaleLowerCase();
      const haystack =
        `${entry.title} ${entry.kind} ${entry.summary} ${entry.keywords}`.toLocaleLowerCase();
      const score =
        title === normalized
          ? 0
          : title.startsWith(normalized)
            ? 1
            : title.includes(normalized)
              ? 2
              : haystack.includes(normalized)
                ? 3
                : Number.POSITIVE_INFINITY;
      return { entry, score };
    })
    .filter((match) => Number.isFinite(match.score))
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.entry.title.localeCompare(right.entry.title),
    )
    .slice(0, 10);

  results.replaceChildren(
    ...matches.map(({ entry }) => {
      const link = document.createElement("a");
      link.href = entry.href;
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const summary = document.createElement("span");
      summary.textContent = `${entry.kind} · ${entry.summary}`;
      link.append(title, summary);
      return link;
    }),
  );
  if (matches.length === 0) {
    const empty = document.createElement("span");
    empty.textContent = "No matching symbols or guides.";
    empty.style.padding = "10px 12px";
    results.append(empty);
  }
  results.hidden = false;
};

if (search instanceof HTMLInputElement) {
  fetch(`${basePath}search-index.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`Search index: ${response.status}`);
      return response.json();
    })
    .then((value) => {
      index = Array.isArray(value) ? value : [];
    })
    .catch(() => {
      index = [];
    });

  search.addEventListener("input", () => showResults(search.value));
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      search.value = "";
      hideResults();
      search.blur();
    }
    if (event.key === "Enter") {
      const first = results?.querySelector("a");
      if (first instanceof HTMLAnchorElement) first.click();
    }
  });
}

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement;
  if (
    search instanceof HTMLInputElement &&
    ((event.key === "/" && !isTyping) ||
      ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"))
  ) {
    event.preventDefault();
    search.focus();
  }
  if (event.key === "Escape") {
    hideResults();
    sidebar?.classList.remove("is-open");
    menu?.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (
    results instanceof HTMLElement &&
    search instanceof HTMLInputElement &&
    target instanceof Node &&
    !results.contains(target) &&
    target !== search
  ) {
    hideResults();
  }
});

menu?.addEventListener("click", () => {
  const open = sidebar?.classList.toggle("is-open") ?? false;
  menu.setAttribute("aria-expanded", String(open));
});

sidebar?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 860px)").matches) {
      sidebar.classList.remove("is-open");
      menu?.setAttribute("aria-expanded", "false");
    }
  });
});
