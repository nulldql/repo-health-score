import type { Check, Finding } from "./types.js";
import { result } from "./types.js";

export const docsCheck: Check = {
  id: "documentation",
  name: "Documentation",
  maxScore: 20,
  async run(ctx) {
    const files = ctx.communityProfile?.files;

    const findings: Finding[] = [
      {
        ok: Boolean(files?.readme),
        label: "Has a README",
        detail: files?.readme ? "README found." : "No README detected at the repo root.",
      },
      {
        ok: Boolean(files?.license),
        label: "Has a LICENSE",
        detail: files?.license ? "LICENSE found." : "No LICENSE file detected.",
      },
      {
        ok: Boolean(files?.contributing),
        label: "Has CONTRIBUTING guidelines",
        detail: files?.contributing ? "CONTRIBUTING found." : "No CONTRIBUTING file detected.",
      },
      {
        ok: Boolean(files?.code_of_conduct),
        label: "Has a CODE_OF_CONDUCT",
        detail: files?.code_of_conduct ? "CODE_OF_CONDUCT found." : "No CODE_OF_CONDUCT detected.",
      },
      {
        ok: Boolean(ctx.repoInfo.description && ctx.repoInfo.description.trim().length > 0),
        label: "Repo has a description set",
        detail: ctx.repoInfo.description
          ? "Repository description is set."
          : "No description set on the repository itself.",
      },
    ];

    return result(this.id, this.name, this.maxScore, findings);
  },
};
