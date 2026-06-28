import { createAttuneTuiPlugin } from "../../shared/tui.js"

export default createAttuneTuiPlugin({
  id: "@attune/tend-token-audit-opencode",
  title: "Attune Token Audit",
  capability: "tokenAudit",
})
