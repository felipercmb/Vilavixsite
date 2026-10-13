import { handleMetaLeads } from "../server/meta-leads-handler.js";

export default {
  fetch(request) {
    return handleMetaLeads(request, process.env);
  },
};
