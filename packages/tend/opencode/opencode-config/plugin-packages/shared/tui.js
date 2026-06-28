export const createAttuneTuiPlugin = ({ id, title, capability }) => ({
  id,
  tui: async (api) => {
    api.keymap.registerLayer({
      commands: [
        {
          name: `attune.${id.replace(/^@attune\//u, "").replace(/[^a-z0-9:-]+/giu, "-")}.status`,
          title,
          category: "Attune",
          namespace: "palette",
          run() {
            api.ui.toast({
              variant: "info",
              message: `${title} loaded (${capability}).`,
            })
          },
        },
      ],
      bindings: [],
    })
  },
})
