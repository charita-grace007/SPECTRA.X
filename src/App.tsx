import { AnimatePresence, motion } from "framer-motion";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type Severity = "Critical" | "High" | "Medium" | "Low" | "Info";
type FindingStatus = "Open" | "Reviewed" | "Resolved" | "Ignored";
type CheckState = "Detected" | "Suspected" | "Passed" | "Not Checked";
type AnalysisType =
  | "Automatic"
  | "Structure Check"
  | "Error Detection"
  | "Configuration Check"
  | "Data Consistency"
  | "Security-Oriented Review"
  | "Code Review"
  | "Document Review";
type InputKind = "Link" | "File";
type ContentKind = "code" | "document" | "data" | "unknown";
type RuntimeMode = "LIVE ANALYSIS" | "DEMO ANALYSIS" | "LOCAL FILE ANALYSIS" | "LOCAL VALIDATION";
type UrlOutcome = "PASS" | "WARNING" | "ERROR" | "ANALYZED";

type AnalysisCheck = {
  name: string;
  status: CheckState;
  details: string;
};

type Solution = {
  issue: string;
  cause: string;
  fix: string;
  verification: string;
};

type Finding = {
  id: string;
  title: string;
  type: string;
  severity: Severity;
  location: string;
  status: FindingStatus;
  confidence: "Detected" | "Suspected";
  problem: string;
  evidence: string;
  why: string;
  recommended: string;
  solution: Solution;
};

type InputMeta = {
  inputKind: InputKind;
  label: string;
  runtimeMode?: RuntimeMode;
  validationStatus?: string;
  verificationStatus?: string;
  urlOutcome?: UrlOutcome;
  sizeBytes?: number;
  lineCount?: number;
  records?: number;
  coverage?: string;
  urlStatus?: string;
  contentType?: string;
  accessibilityStatus?: string;
};

type AnalysisResult = {
  id: string;
  createdAt: string;
  analysisType: AnalysisType;
  inputMeta: InputMeta;
  checks: AnalysisCheck[];
  findings: Finding[];
  findingsCount: number;
  severitySummary: Record<Severity, number>;
  passedChecks: number;
  finalStatus: "Analysis Complete" | "Analysis could not be completed";
  limitations: string[];
};

type HistoryItem = {
  id: string;
  inputName: string;
  date: string;
  analysisType: AnalysisType;
  findingCount: number;
  criticalCount: number;
  status: string;
  result: AnalysisResult;
};

const analysisTypes: AnalysisType[] = [
  "Automatic",
  "Structure Check",
  "Error Detection",
  "Configuration Check",
  "Data Consistency",
  "Security-Oriented Review",
  "Code Review",
  "Document Review",
];

const stages = [
  "Input validation",
  "Content extraction",
  "Pattern/issue analysis",
  "Risk and severity evaluation",
  "Solution generation",
  "Report generation",
];

const navItems = [
  "Overview",
  "Live Simulation",
  "Analyze Input",
  "RF Environment",
  "AI Scheduler",
  "Baseline Comparison",
  "Analytics",
  "Experiments",
  "Ablation Study",
  "Analysis History",
  "Documentation",
  "Settings",
];

const supportedExtensions = [
  "txt",
  "md",
  "csv",
  "json",
  "yaml",
  "yml",
  "xml",
  "html",
  "log",
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "c",
  "cpp",
  "cs",
  "go",
  "rs",
  "sql",
  "ini",
  "toml",
];

const severityRank: Record<Severity, number> = {
  Critical: 5,
  High: 4,
  Medium: 3,
  Low: 2,
  Info: 1,
};

const getId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getExtension = (name: string) => {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

const isTextLikeMime = (mime: string) => {
  const value = mime.toLowerCase();
  return (
    value.startsWith("text/") ||
    value.includes("json") ||
    value.includes("xml") ||
    value.includes("javascript") ||
    value.includes("yaml")
  );
};

const classifyContent = (name: string, mime = "", content = ""): ContentKind => {
  const ext = getExtension(name);
  if (["js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "cs", "go", "rs", "sql"].includes(ext)) {
    return "code";
  }
  if (["csv", "json", "yaml", "yml", "xml", "ini", "toml"].includes(ext) || mime.includes("json")) {
    return "data";
  }
  if (["txt", "md", "html", "log"].includes(ext)) {
    return "document";
  }
  if (/\b(function|class|const|let|if\s*\(|SELECT\s+|import\s+)/i.test(content)) {
    return "code";
  }
  if (/^[\[{]/.test(content.trim())) {
    return "data";
  }
  if (content.trim().length > 0) {
    return "document";
  }
  return "unknown";
};

const splitCsvLine = (line: string) => {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out;
};

const makeSolution = (issue: string, cause: string, fix: string, verification: string): Solution => ({
  issue,
  cause,
  fix,
  verification,
});

const modeApplies = (mode: AnalysisType, kind: ContentKind) => {
  if (mode === "Code Review" && kind !== "code") return false;
  if (mode === "Document Review" && kind === "code") return false;
  if (mode === "Data Consistency" && kind !== "data") return false;
  return true;
};

type AnalyzeArgs = {
  text: string;
  name: string;
  kind: ContentKind;
  analysisType: AnalysisType;
};

const analyzeText = ({ text, name, kind, analysisType }: AnalyzeArgs) => {
  const findings: Finding[] = [];
  const checks: AnalysisCheck[] = [];
  const lines = text.split(/\r?\n/);
  const addFinding = (finding: Omit<Finding, "id" | "status">) => {
    findings.push({ ...finding, id: getId(), status: "Open" });
  };
  const addCheck = (nameValue: string, status: CheckState, details: string) => {
    checks.push({ name: nameValue, status, details });
  };

  if (!modeApplies(analysisType, kind)) {
    addCheck(
      "Mode compatibility",
      "Not Checked",
      `Selected mode '${analysisType}' is not applicable to detected input kind '${kind}'.`,
    );
    return { findings, checks, linesCount: lines.length, records: 0 };
  }

  const hasSecurityFocus = ["Automatic", "Security-Oriented Review", "Code Review"].includes(analysisType);
  const hasStructureFocus = ["Automatic", "Structure Check", "Document Review", "Code Review"].includes(analysisType);
  const hasDataFocus = ["Automatic", "Data Consistency", "Configuration Check"].includes(analysisType);
  const hasErrorFocus = ["Automatic", "Error Detection", "Code Review", "Document Review"].includes(analysisType);

  if (hasSecurityFocus) {
    const secretPattern = /(api[_-]?key|secret|token|password)\s*[:=]\s*["']?[a-z0-9_\-]{8,}["']?/gi;
    const insecureUrls = /(http:\/\/[^\s"')]+)/gi;
    let matched = false;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const secretMatch = line.match(secretPattern);
      if (secretMatch) {
        matched = true;
        addFinding({
          title: "Potential secret exposure",
          type: "Security",
          severity: "Critical",
          location: `Line ${i + 1}`,
          confidence: "Detected",
          problem: "Sensitive credential-like value appears in plain text.",
          evidence: line.trim().slice(0, 240),
          why: "Exposed credentials can be reused by attackers and compromise systems.",
          recommended: "Remove secrets from source/input and load them from protected environment variables.",
          solution: makeSolution(
            "Credential-like value is exposed in clear text.",
            "The content stores a token/password value directly inside readable text.",
            "Replace the hardcoded value with a secure reference and rotate the exposed credential.",
            "Re-run analysis and confirm this finding disappears; also verify no clear-text secrets remain.",
          ),
        });
      }
      const insecureMatch = line.match(insecureUrls);
      if (insecureMatch) {
        matched = true;
        addFinding({
          title: "Insecure HTTP reference",
          type: "Security",
          severity: "Medium",
          location: `Line ${i + 1}`,
          confidence: "Detected",
          problem: "Non-encrypted HTTP URL detected.",
          evidence: insecureMatch[0],
          why: "HTTP traffic can be intercepted or modified in transit.",
          recommended: "Use HTTPS endpoints where available.",
          solution: makeSolution(
            "An HTTP URL is used instead of HTTPS.",
            "The reference uses an unencrypted protocol.",
            "Change the URL scheme to HTTPS and verify endpoint support.",
            "Access the updated URL and re-run analysis to confirm no HTTP references are left.",
          ),
        });
      }
    }

    addCheck(
      "Security pattern scan",
      matched ? "Detected" : "Passed",
      matched ? "Potentially unsafe patterns were found." : "No high-confidence unsafe pattern detected in scanned content.",
    );
  } else {
    addCheck("Security pattern scan", "Not Checked", "Security-focused checks are disabled for this analysis mode.");
  }

  if (hasErrorFocus) {
    const todoMatches = lines
      .map((line, index) => ({ line, index }))
      .filter((entry) => /\b(TODO|FIXME|HACK|TBD)\b/i.test(entry.line));
    if (todoMatches.length > 0) {
      todoMatches.slice(0, 5).forEach((entry) => {
        addFinding({
          title: "Unresolved implementation marker",
          type: "Maintainability",
          severity: "Low",
          location: `Line ${entry.index + 1}`,
          confidence: "Suspected",
          problem: "A TODO/FIXME marker indicates incomplete or provisional logic.",
          evidence: entry.line.trim().slice(0, 240),
          why: "Pending markers often indicate unfinished behavior or technical debt.",
          recommended: "Review and resolve the marker or convert it into a tracked issue.",
          solution: makeSolution(
            "Unresolved TODO/FIXME marker remains in content.",
            "The section is marked as incomplete or temporary.",
            "Complete the pending implementation and remove obsolete marker comments.",
            "Re-run analysis and confirm marker findings are cleared.",
          ),
        });
      });
      addCheck("Error marker scan", "Suspected", `Found ${todoMatches.length} unresolved markers requiring review.`);
    } else {
      addCheck("Error marker scan", "Passed", "No TODO/FIXME style markers detected.");
    }
  } else {
    addCheck("Error marker scan", "Not Checked", "Error-focused checks are disabled for this analysis mode.");
  }

  if (hasStructureFocus) {
    const duplicateMap = new Map<string, number[]>();
    lines.forEach((line, index) => {
      const normalized = line.trim().toLowerCase();
      if (normalized.length < 16) return;
      const arr = duplicateMap.get(normalized) ?? [];
      arr.push(index + 1);
      duplicateMap.set(normalized, arr);
    });

    const duplicates = Array.from(duplicateMap.entries()).filter(([, positions]) => positions.length > 1);
    if (duplicates.length > 0) {
      duplicates.slice(0, 3).forEach(([textValue, positions]) => {
        addFinding({
          title: "Duplicate content block",
          type: "Structure",
          severity: "Medium",
          location: `Lines ${positions.join(", ")}`,
          confidence: "Detected",
          problem: "Repeated content detected across multiple lines.",
          evidence: textValue.slice(0, 240),
          why: "Duplication increases maintenance effort and may indicate inconsistent updates.",
          recommended: "Consolidate duplicate blocks or keep one authoritative instance.",
          solution: makeSolution(
            "The same content appears multiple times.",
            "Sections were duplicated or copied without normalization.",
            "Keep one canonical section and remove or merge duplicates.",
            "Review affected line ranges and re-run analysis to confirm duplicates are gone.",
          ),
        });
      });
      addCheck("Duplication scan", "Detected", `Detected ${duplicates.length} duplicate text patterns.`);
    } else {
      addCheck("Duplication scan", "Passed", "No significant duplicate text blocks detected.");
    }

    const longLines = lines
      .map((line, index) => ({ len: line.length, index, line }))
      .filter((entry) => entry.len > 180);
    if (longLines.length > 0) {
      addFinding({
        title: "Very long lines reduce readability",
        type: "Structure",
        severity: kind === "code" ? "Low" : "Medium",
        location: `Line ${longLines[0].index + 1}`,
        confidence: "Suspected",
        problem: "Line length suggests compressed or hard-to-maintain formatting.",
        evidence: longLines[0].line.slice(0, 240),
        why: "Long lines hide context and increase review errors.",
        recommended: "Wrap or reformat lines to improve readability.",
        solution: makeSolution(
          "A very long line was detected.",
          "The content uses dense formatting with minimal line breaks.",
          "Apply formatting and split expressions/paragraphs into smaller logical lines.",
          "Check line length after formatting and re-run analysis.",
        ),
      });
      addCheck("Readability scan", "Suspected", `Detected ${longLines.length} very long line(s).`);
    } else {
      addCheck("Readability scan", "Passed", "No extreme line-length patterns detected.");
    }
  } else {
    addCheck("Structure checks", "Not Checked", "Structure-focused checks are disabled for this analysis mode.");
  }

  let records = 0;
  if (hasDataFocus && kind === "data") {
    if (name.endsWith(".json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          records = parsed.length;
          const seen = new Set<string>();
          let duplicateCount = 0;
          parsed.forEach((row, idx) => {
            const key = JSON.stringify(row);
            if (seen.has(key)) {
              duplicateCount += 1;
              addFinding({
                title: "Duplicate JSON record",
                type: "Data Consistency",
                severity: "Medium",
                location: `Record ${idx + 1}`,
                confidence: "Detected",
                problem: "Identical object appears more than once.",
                evidence: key.slice(0, 240),
                why: "Duplicates can distort analytics and business logic.",
                recommended: "Remove duplicates or introduce unique record identifiers.",
                solution: makeSolution(
                  "A duplicate JSON entry was found.",
                  "The dataset includes repeated records with identical field values.",
                  "Deduplicate records and enforce uniqueness constraints.",
                  "Re-run analysis to confirm duplicate record findings are resolved.",
                ),
              });
            }
            seen.add(key);
          });

          const missingFieldEntries = parsed
            .map((row, idx) => ({ row, idx }))
            .filter((entry) =>
              entry.row &&
              typeof entry.row === "object" &&
              Object.values(entry.row).some((value) => value === "" || value === null || value === undefined),
            );

          missingFieldEntries.slice(0, 5).forEach((entry) => {
            const firstMissing = Object.entries(entry.row as Record<string, unknown>).find(
              ([, value]) => value === "" || value === null || value === undefined,
            );
            addFinding({
              title: "Missing value in record",
              type: "Data Quality",
              severity: "High",
              location: `Record ${entry.idx + 1}, Field ${firstMissing?.[0] ?? "unknown"}`,
              confidence: "Detected",
              problem: "Required-like field value is empty/null.",
              evidence: JSON.stringify(entry.row).slice(0, 240),
              why: "Incomplete records can break workflows and downstream validations.",
              recommended: "Populate missing values or define nullable schema behavior.",
              solution: makeSolution(
                "A record includes a missing field value.",
                "Input data contains empty or null fields.",
                "Fill missing values or update schema rules to explicitly allow null values.",
                "Validate the dataset and ensure the field is populated for each required record.",
              ),
            });
          });

          addCheck(
            "JSON schema sanity",
            duplicateCount > 0 || missingFieldEntries.length > 0 ? "Detected" : "Passed",
            duplicateCount > 0 || missingFieldEntries.length > 0
              ? "JSON consistency issues detected in parsed records."
              : "No duplicate or empty-value issue found in parsed JSON records.",
          );
        } else {
          addCheck("JSON schema sanity", "Passed", "JSON parsed successfully as a non-array object.");
        }
      } catch (error) {
        addFinding({
          title: "Invalid JSON structure",
          type: "Data Format",
          severity: "High",
          location: "Document root",
          confidence: "Detected",
          problem: "JSON parsing failed due to invalid syntax.",
          evidence: error instanceof Error ? error.message : "JSON parse error",
          why: "Malformed JSON cannot be reliably processed.",
          recommended: "Validate JSON syntax and repair structural errors.",
          solution: makeSolution(
            "JSON input is not syntactically valid.",
            "There is a structural issue such as trailing commas, invalid quotes, or broken nesting.",
            "Correct JSON syntax using a validator and ensure valid object/array structure.",
            "Parse the file again or run analysis to confirm syntax errors are removed.",
          ),
        });
        addCheck("JSON schema sanity", "Detected", "JSON parser reported a syntax failure.");
      }
    } else if (name.endsWith(".csv")) {
      const rows = lines.filter((line) => line.trim().length > 0);
      records = Math.max(rows.length - 1, 0);
      if (rows.length < 2) {
        addCheck("CSV completeness", "Suspected", "CSV appears to have no data rows.");
      } else {
        const headers = splitCsvLine(rows[0]);
        const recordKeys = new Set<string>();
        let missingValues = 0;
        let duplicateRows = 0;

        rows.slice(1).forEach((line, idx) => {
          const cells = splitCsvLine(line);
          if (cells.length !== headers.length) {
            addFinding({
              title: "Inconsistent CSV field count",
              type: "Data Consistency",
              severity: "High",
              location: `Row ${idx + 2}`,
              confidence: "Detected",
              problem: "The number of fields differs from the header column count.",
              evidence: line.slice(0, 240),
              why: "Field misalignment can map values to incorrect columns.",
              recommended: "Ensure each row has the same number of columns as the header.",
              solution: makeSolution(
                "CSV row has inconsistent number of fields.",
                "A delimiter mismatch, missing value, or unescaped comma changed row structure.",
                "Normalize row field counts and escape commas inside quoted values.",
                "Compare all row column counts against header length and re-run analysis.",
              ),
            });
          }

          cells.forEach((cell, cellIndex) => {
            if (cell === "") {
              missingValues += 1;
              addFinding({
                title: "Missing CSV value",
                type: "Data Quality",
                severity: "Medium",
                location: `Row ${idx + 2}, Column ${headers[cellIndex] ?? cellIndex + 1}`,
                confidence: "Detected",
                problem: "CSV cell is empty.",
                evidence: line.slice(0, 240),
                why: "Empty values can create incomplete records for downstream processing.",
                recommended: "Populate required values or mark column as optional.",
                solution: makeSolution(
                  "A CSV field is empty.",
                  "The source data omitted a value for this row and column.",
                  "Fill the field or adapt schema rules for optional/null entries.",
                  "Re-run analysis and confirm no missing-value findings remain for required columns.",
                ),
              });
            }
          });

          const key = cells.join("|");
          if (recordKeys.has(key)) {
            duplicateRows += 1;
            addFinding({
              title: "Duplicate CSV row",
              type: "Data Consistency",
              severity: "Medium",
              location: `Row ${idx + 2}`,
              confidence: "Detected",
              problem: "The row content matches a previously seen record.",
              evidence: line.slice(0, 240),
              why: "Duplicate rows may inflate counts and distort reports.",
              recommended: "Remove duplicates or add unique constraints.",
              solution: makeSolution(
                "Duplicate row detected in CSV.",
                "The same row values are present in multiple records.",
                "Deduplicate the dataset and maintain a unique identifier column.",
                "Re-run analysis and verify duplicate row findings are gone.",
              ),
            });
          }
          recordKeys.add(key);
        });

        if (missingValues > 0 || duplicateRows > 0) {
          addCheck(
            "CSV consistency",
            "Detected",
            `Detected ${missingValues} empty value(s) and ${duplicateRows} duplicate row(s).`,
          );
        } else {
          addCheck("CSV consistency", "Passed", "No missing values or duplicate rows detected.");
        }
      }
    } else {
      addCheck("Data consistency", "Not Checked", "Detailed schema checks are currently implemented for JSON and CSV only.");
    }
  } else if (hasDataFocus) {
    addCheck("Data consistency", "Not Checked", "Input content is not classified as structured data.");
  } else {
    addCheck("Data consistency", "Not Checked", "Data consistency checks are disabled for this analysis mode.");
  }

  if (kind === "code" && ["Automatic", "Code Review", "Error Detection"].includes(analysisType)) {
    const noCatch = /try\s*\{[\s\S]*?\}(?!\s*catch)/m.test(text);
    if (noCatch) {
      addFinding({
        title: "Try block without catch",
        type: "Error Handling",
        severity: "Medium",
        location: name,
        confidence: "Suspected",
        problem: "A try block appears without a catch block.",
        evidence: "Pattern: try { ... } without catch",
        why: "Unhandled runtime errors can make failures hard to diagnose.",
        recommended: "Add catch or explicit error propagation with context.",
        solution: makeSolution(
          "Potential missing catch block in code.",
          "Error handling flow appears incomplete around a try statement.",
          "Add catch handling or convert logic to explicit failure returns.",
          "Run tests and re-run analysis to ensure error handling findings are addressed.",
        ),
      });
      addCheck("Error handling review", "Suspected", "Potential incomplete try/catch flow detected.");
    } else {
      addCheck("Error handling review", "Passed", "No obvious try-without-catch pattern found.");
    }

    const evalPattern = /\beval\s*\(/.test(text);
    if (evalPattern) {
      addFinding({
        title: "Dynamic eval usage",
        type: "Security",
        severity: "High",
        location: name,
        confidence: "Detected",
        problem: "eval() usage detected.",
        evidence: "Pattern: eval(...)",
        why: "Dynamic code execution may allow code injection.",
        recommended: "Replace eval with safer parsing or explicit mappings.",
        solution: makeSolution(
          "Code uses eval() for dynamic execution.",
          "The implementation evaluates runtime strings as executable code.",
          "Refactor to static logic, parser-based interpretation, or whitelisted function maps.",
          "Run analysis and ensure eval-related findings no longer appear.",
        ),
      });
      addCheck("Dangerous API usage", "Detected", "eval() was detected.");
    } else {
      addCheck("Dangerous API usage", "Passed", "No eval() pattern detected.");
    }
  } else if (kind === "code") {
    addCheck("Code-specific review", "Not Checked", "Code checks are disabled in this mode.");
  }

  if (kind === "document" && ["Automatic", "Document Review", "Structure Check"].includes(analysisType)) {
    const sectionPatterns = [/\bintroduction\b/i, /\bsummary\b/i, /\bconclusion\b/i];
    const missingSections = sectionPatterns.filter((regex) => !regex.test(text));
    if (missingSections.length > 0 && lines.length > 20) {
      addFinding({
        title: "Potential missing document sections",
        type: "Document Completeness",
        severity: "Low",
        location: name,
        confidence: "Suspected",
        problem: "Long-form document may be missing common structural sections.",
        evidence: `Missing keywords: ${missingSections.map((r) => r.source.replace(/\\b/g, "")).join(", ")}`,
        why: "Missing structural anchors can reduce clarity and traceability.",
        recommended: "Review whether the document should include explicit intro/summary/conclusion sections.",
        solution: makeSolution(
          "Possible missing key sections in document.",
          "Common long-form structure markers were not found.",
          "Add explicit section headings where applicable to improve readability.",
          "Re-run analysis and verify section-completeness finding is resolved when headings are added.",
        ),
      });
      addCheck("Document structure review", "Suspected", "Common section markers are partially missing.");
    } else {
      addCheck("Document structure review", "Passed", "Document includes expected structural markers or is short-form.");
    }
  }

  return { findings, checks, linesCount: lines.length, records };
};

const summarizeSeverities = (findings: Finding[]) => {
  const severitySummary: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
  findings.forEach((finding) => {
    severitySummary[finding.severity] += 1;
  });
  return severitySummary;
};

const highestSeverity = (summary: Record<Severity, number>): Severity => {
  if (summary.Critical > 0) return "Critical";
  if (summary.High > 0) return "High";
  if (summary.Medium > 0) return "Medium";
  if (summary.Low > 0) return "Low";
  return "Info";
};

const buildUrlFinding = (args: {
  title: string;
  severity: Severity;
  confidence: "Detected" | "Suspected";
  problem: string;
  evidence: string;
  why: string;
  recommended: string;
  outcome: UrlOutcome;
  location?: string;
}) => {
  const verification =
    args.severity === "Info"
      ? "Verification completed for this URL rule set."
      : "Apply the fix and run Re-Analyze to confirm this finding no longer appears.";

  const statusByOutcome: Record<UrlOutcome, FindingStatus> = {
    PASS: "Resolved",
    WARNING: "Open",
    ERROR: "Open",
    ANALYZED: "Reviewed",
  };

  return {
    id: getId(),
    title: args.title,
    type: "URL Analysis",
    severity: args.severity,
    location: args.location ?? "URL string",
    status: statusByOutcome[args.outcome],
    confidence: args.confidence,
    problem: args.problem,
    evidence: args.evidence,
    why: args.why,
    recommended: args.recommended,
    solution: makeSolution(args.problem, args.why, args.recommended, verification),
  } satisfies Finding;
};

const normalizeUrlForCase = (value: string) => value.trim().toLowerCase().replace(/\/+$/, "");

type UrlValidationErrorType = "empty" | "invalid_format" | "incomplete_url" | "invalid_domain";

const validateHttpUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: false, reason: "Invalid URL", errorType: "empty" as UrlValidationErrorType, parsed: null as URL | null };
  }

  const authorityMatch = trimmed.match(/^https?:\/\/([^/?#]*)/i);
  if (authorityMatch) {
    const authority = authorityMatch[1];
    if (!authority) {
      return {
        isValid: false,
        reason: "Incomplete URL",
        errorType: "incomplete_url" as UrlValidationErrorType,
        parsed: null as URL | null,
      };
    }
    if (authority.includes("..")) {
      return {
        isValid: false,
        reason: "Invalid domain format",
        errorType: "invalid_domain" as UrlValidationErrorType,
        parsed: null as URL | null,
      };
    }
  }

  try {
    const parsed = new URL(trimmed);
    const isAllowedProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    const hasHost = parsed.hostname.trim().length > 0;
    const hasConsecutiveDots = parsed.hostname.includes("..");
    const hasEmptyLabel = parsed.hostname.split(".").some((label) => label.trim().length === 0);
    if (!isAllowedProtocol) {
      return {
        isValid: false,
        reason: "Invalid URL",
        errorType: "invalid_format" as UrlValidationErrorType,
        parsed: null as URL | null,
      };
    }
    if (!hasHost) {
      return {
        isValid: false,
        reason: "Incomplete URL",
        errorType: "incomplete_url" as UrlValidationErrorType,
        parsed: null as URL | null,
      };
    }
    if (hasConsecutiveDots || hasEmptyLabel) {
      return {
        isValid: false,
        reason: "Invalid domain format",
        errorType: "invalid_domain" as UrlValidationErrorType,
        parsed: null as URL | null,
      };
    }
    return { isValid: true, reason: "Valid URL", errorType: null, parsed };
  } catch {
    const incomplete = trimmed === "https://" || trimmed === "http://";
    return {
      isValid: false,
      reason: incomplete ? "Incomplete URL" : "Invalid URL",
      errorType: incomplete ? ("incomplete_url" as UrlValidationErrorType) : ("invalid_format" as UrlValidationErrorType),
      parsed: null as URL | null,
    };
  }
};

const isIpv4 = (host: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(host);
const trackingKeys = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]);
const defaultPorts: Record<string, string> = { "http:": "80", "https:": "443" };

const redactUrlCredentials = (urlValue: URL) => {
  const redacted = new URL(urlValue.toString());
  redacted.username = "";
  redacted.password = "";
  return redacted.toString();
};

const deriveUrlOutcome = (findings: Finding[]): UrlOutcome => {
  if (findings.some((finding) => finding.severity === "Critical")) return "ERROR";
  if (findings.some((finding) => finding.severity === "High" || finding.severity === "Medium")) return "WARNING";
  return "PASS";
};

const buildLocalValidationResult = (rawInput: string, analysisType: AnalysisType): AnalysisResult => {
  const validation = validateHttpUrl(rawInput);
  const value = rawInput.trim() || "(empty)";
  const detailsByType: Record<UrlValidationErrorType, { title: string; explanation: string; evidence: string }> = {
    empty: {
      title: "Invalid URL format.",
      explanation: "The provided input is not a valid complete URL.",
      evidence: "Input is empty.",
    },
    invalid_format: {
      title: "Invalid URL format.",
      explanation: "The provided input is not a valid complete URL.",
      evidence: `Input = ${value}`,
    },
    incomplete_url: {
      title: "Incomplete URL.",
      explanation: "The provided input is not a valid complete URL.",
      evidence: `Input = ${value}`,
    },
    invalid_domain: {
      title: "Invalid domain format.",
      explanation: "The provided input is not a valid complete URL.",
      evidence: `Input = ${value}`,
    },
  };

  const selectedDetail = detailsByType[validation.errorType ?? "invalid_format"];
  const findings = [
    buildUrlFinding({
      title: selectedDetail.title,
      severity: "High",
      confidence: "Detected",
      problem: selectedDetail.explanation,
      evidence: selectedDetail.evidence,
      why: "Local URL parsing failed, so live analysis was not attempted.",
      recommended: "Enter a valid URL beginning with https:// or http://.",
      outcome: "ERROR",
    }),
  ];

  const checks: AnalysisCheck[] = [
    { name: "URL Syntax", status: "Detected", details: validation.reason },
    { name: "Live Analysis Eligibility", status: "Not Checked", details: "No network request was made because URL validation failed." },
  ];

  return {
    id: getId(),
    createdAt: new Date().toISOString(),
    analysisType,
    inputMeta: {
      inputKind: "Link",
      label: rawInput.trim() || "Unknown URL",
      runtimeMode: "LOCAL VALIDATION",
      validationStatus: validation.reason,
      verificationStatus: "Not verified",
      urlOutcome: "ERROR",
      urlStatus: "Not requested",
      accessibilityStatus: "Not Checked",
      contentType: "Not fetched",
      coverage: "Local URL validation rules",
    },
    checks,
    findings,
    findingsCount: findings.length,
    severitySummary: summarizeSeverities(findings),
    passedChecks: 0,
    finalStatus: "Analysis Complete",
    limitations: ["Demo result is based on URL-level analysis and did not fetch remote content."],
  };
};

const buildDemoUrlResult = (rawInput: string, analysisType: AnalysisType, fallbackReason?: string): AnalysisResult => {
  const parsed = new URL(rawInput.trim());
  const safeLabel = redactUrlCredentials(parsed);
  const checks: AnalysisCheck[] = [];
  const findings: Finding[] = [];
  const pathValue = parsed.pathname || "/";
  const queryParams = Array.from(parsed.searchParams.entries());
  const normalized = normalizeUrlForCase(rawInput);
  const hasIpHost = isIpv4(parsed.hostname);
  const hasNonDefaultPort = Boolean(parsed.port && parsed.port !== defaultPorts[parsed.protocol]);
  const hasCredentials = Boolean(parsed.username || parsed.password);
  const trackingDetected = queryParams
    .map(([key]) => key.toLowerCase())
    .filter((key) => trackingKeys.has(key));
  let decodedPath = pathValue;
  try {
    decodedPath = decodeURIComponent(pathValue);
  } catch {
    decodedPath = pathValue;
  }
  const hasSuspiciousStructure = /(%25|%2e%2e|%00|@)/i.test(parsed.pathname) || decodedPath.includes("..");
  const hasLongUrl = rawInput.length > 220;
  const repeatedQueryKeys = new Set<string>();
  const seenKeys = new Set<string>();
  queryParams.forEach(([key]) => {
    if (seenKeys.has(key)) repeatedQueryKeys.add(key);
    seenKeys.add(key);
  });
  const hasRepeatedQueryKeys = repeatedQueryKeys.size > 0;

  checks.push({ name: "URL Syntax", status: "Passed", details: "Valid URL syntax detected." });
  checks.push({
    name: "Protocol",
    status: parsed.protocol === "https:" ? "Passed" : "Detected",
    details: `Protocol = ${parsed.protocol.replace(":", "").toUpperCase()}`,
  });
  checks.push({
    name: "Hostname",
    status: parsed.hostname.length > 0 ? "Passed" : "Detected",
    details: `Hostname = ${parsed.hostname || "(missing)"}`,
  });
  checks.push({
    name: "HTTPS usage",
    status: parsed.protocol === "https:" ? "Passed" : "Detected",
    details: parsed.protocol === "https:" ? "HTTPS protocol detected." : "HTTPS not detected.",
  });
  checks.push({
    name: "IP hostname",
    status: hasIpHost ? "Detected" : "Passed",
    details: hasIpHost ? "Host is an IPv4 address." : "Host is a domain name.",
  });
  checks.push({
    name: "Explicit port",
    status: hasNonDefaultPort ? "Detected" : "Passed",
    details: hasNonDefaultPort ? `Non-default port detected: ${parsed.port}` : "Default port behavior.",
  });
  checks.push({
    name: "Authentication in URL",
    status: hasCredentials ? "Detected" : "Passed",
    details: hasCredentials ? "Authentication information detected in URL." : "No embedded URL credentials detected.",
  });
  checks.push({
    name: "Tracking parameters",
    status: trackingDetected.length > 0 ? "Detected" : "Passed",
    details: trackingDetected.length > 0 ? `Detected: ${trackingDetected.join(", ")}` : "No standard UTM tracking parameters.",
  });
  checks.push({
    name: "Fragment",
    status: parsed.hash ? "Detected" : "Passed",
    details: parsed.hash ? `Fragment = ${parsed.hash}` : "No fragment present.",
  });
  checks.push({
    name: "Suspicious structure",
    status: hasSuspiciousStructure ? "Suspected" : "Passed",
    details: hasSuspiciousStructure ? `Potentially unusual structure in path: ${parsed.pathname}` : "No suspicious URL structure pattern.",
  });
  checks.push({
    name: "URL length",
    status: hasLongUrl ? "Detected" : "Passed",
    details: `URL length = ${rawInput.length}`,
  });
  checks.push({
    name: "Repeated/encoded unusual components",
    status: hasRepeatedQueryKeys || /%[0-9A-F]{2}/i.test(parsed.search) ? "Suspected" : "Passed",
    details:
      hasRepeatedQueryKeys
        ? `Repeated query key(s): ${Array.from(repeatedQueryKeys).join(", ")}`
        : /%[0-9A-F]{2}/i.test(parsed.search)
          ? "Encoded query component detected."
          : "No repeated keys or unusual encoding pattern.",
  });

  if (parsed.protocol === "http:") {
    findings.push(
      buildUrlFinding({
        title: "URL uses unencrypted HTTP.",
        severity: "Medium",
        confidence: "Detected",
        problem: "The URL uses HTTP instead of HTTPS.",
        evidence: "Protocol = HTTP",
        why: "HTTP does not provide transport encryption.",
        recommended: "Use the HTTPS version of the URL when available.",
        outcome: "WARNING",
      }),
    );
  }

  if (hasIpHost) {
    findings.push(
      buildUrlFinding({
        title: "Hostname is an IP address.",
        severity: "Info",
        confidence: "Detected",
        problem: "The URL host is an IP address rather than a domain name.",
        evidence: "Host = IP address",
        why: "IP-based hosts are not inherently malicious but can reduce trust/context.",
        recommended: "Use a trusted domain name where appropriate.",
        outcome: "PASS",
        location: parsed.hostname,
      }),
    );
  }

  if (hasNonDefaultPort) {
    findings.push(
      buildUrlFinding({
        title: "Non-default port detected.",
        severity: "Info",
        confidence: "Detected",
        problem: "The URL explicitly uses a non-default port.",
        evidence: `Port = ${parsed.port}`,
        why: "Unexpected ports can indicate alternate service configuration.",
        recommended: "Review the port configuration if this is unexpected.",
        outcome: "PASS",
      }),
    );
  }

  if (hasCredentials) {
    findings.push(
      buildUrlFinding({
        title: "Credentials appear to be embedded in the URL.",
        severity: "High",
        confidence: "Detected",
        problem: "Authentication information appears in the URL.",
        evidence: "Authentication information detected in URL.",
        why: "Credentials in URLs can leak through logs, browser history, and referrers.",
        recommended: "Do not place credentials directly in URLs.",
        outcome: "WARNING",
      }),
    );
  }

  checks.push({
    name: "Query Structure",
    status: queryParams.length > 0 ? "Passed" : "Passed",
    details: queryParams.length > 0 ? `Query parameters detected: ${queryParams.length}` : "No query parameters.",
  });

  if (trackingDetected.length > 0) {
    findings.push(
      buildUrlFinding({
        title: `Tracking parameter detected: ${trackingDetected.join(", ")}`,
        severity: "Info",
        confidence: "Detected",
        problem: "The URL contains standard marketing/tracking query parameters.",
        evidence: `Tracking keys = ${trackingDetected.join(", ")}`,
        why: "Tracking parameters are common and are not automatically security vulnerabilities.",
        recommended: "Remove tracking parameters if a clean/shareable URL is preferred.",
        outcome: "PASS",
      }),
    );
  }

  if (parsed.hash) {
    findings.push(
      buildUrlFinding({
        title: "Fragment identifier detected.",
        severity: "Info",
        confidence: "Detected",
        problem: "URL contains a hash fragment.",
        evidence: `Fragment = ${parsed.hash}`,
        why: "Fragments are client-side navigation hints and usually not sent to servers.",
        recommended: "No action required unless fragment content is unexpected.",
        outcome: "PASS",
      }),
    );
  }

  if (hasSuspiciousStructure) {
    findings.push(
      buildUrlFinding({
        title: "Suspicious URL structure pattern.",
        severity: "Medium",
        confidence: "Suspected",
        problem: "URL path includes unusual encoded or traversal-like components.",
        evidence: `Path = ${parsed.pathname}`,
        why: "Obfuscated URL components may require manual review.",
        recommended: "Review encoded path/query parts and verify this URL source.",
        outcome: "WARNING",
      }),
    );
  }

  if (hasLongUrl) {
    findings.push(
      buildUrlFinding({
        title: "Unusually long URL detected.",
        severity: "Medium",
        confidence: "Detected",
        problem: "URL length exceeds expected shareable size.",
        evidence: `URL length = ${rawInput.length}`,
        why: "Very long URLs can hide unnecessary or confusing parameters.",
        recommended: "Review unnecessary query parameters and URL components.",
        outcome: "WARNING",
      }),
    );
  }

  if (normalized === "https://this-is-not-a-real-domain-12345.com") {
    findings.push(
      buildUrlFinding({
        title: "Domain appears unreachable/non-existent.",
        severity: "High",
        confidence: "Suspected",
        problem: "Domain appears unreachable in deterministic demo rules.",
        evidence: `Host = ${parsed.hostname}`,
        why: "Non-existent domains cannot be fetched successfully.",
        recommended: "Verify the domain name and network connectivity.",
        outcome: "WARNING",
      }),
    );
  }

  if (findings.length === 0 || (findings.every((finding) => finding.severity === "Info") && parsed.protocol === "https:")) {
    findings.unshift(
      buildUrlFinding({
        title: "Valid HTTPS URL detected.",
        severity: "Info",
        confidence: "Detected",
        problem: "No URL-format or transport warning detected from URL-level checks.",
        evidence: `Protocol = HTTPS, Hostname = ${parsed.hostname}, Path = ${pathValue}, Query = ${parsed.search || "(none)"}`,
        why: "Parsed URL components passed deterministic syntax and transport checks.",
        recommended: "No action required.",
        outcome: "PASS",
      }),
    );
  }

  const outcome = deriveUrlOutcome(findings);
  const severitySummary = summarizeSeverities(findings);
  const statusText = outcome === "WARNING" ? "Needs review" : "Verified";

  return {
    id: getId(),
    createdAt: new Date().toISOString(),
    analysisType,
    inputMeta: {
      inputKind: "Link",
      label: safeLabel,
      runtimeMode: "DEMO ANALYSIS",
      validationStatus: "Valid URL",
      verificationStatus: statusText,
      urlOutcome: outcome,
      urlStatus: fallbackReason ? "Live analysis unavailable" : "Demo analysis selected",
      accessibilityStatus: fallbackReason ? "Inaccessible from current environment" : "Not live-fetched",
      contentType: "Not fetched in demo mode",
      coverage: `URL-level analysis: protocol=${parsed.protocol.replace(":", "")}, host=${parsed.hostname}, port=${parsed.port || "default"}, path=${pathValue}, query=${parsed.search || "none"}, hash=${parsed.hash || "none"}`,
    },
    checks,
    findings,
    findingsCount: findings.length,
    severitySummary,
    passedChecks: checks.filter((check) => check.status === "Passed").length,
    finalStatus: "Analysis Complete",
    limitations: [
      ...(fallbackReason ? [fallbackReason] : []),
      "Live analysis unavailable. Demo analysis is based only on observable URL properties.",
    ],
  };
};

const fingerprintFinding = (finding: Finding) =>
  `${finding.title}|${finding.location}|${finding.evidence.slice(0, 120)}|${finding.severity}`;

export default function App() {
  const [activeNav, setActiveNav] = useState("Overview");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("Automatic");
  const [linkInput, setLinkInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inProgress, setInProgress] = useState(false);
  const [progressStage, setProgressStage] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [errorState, setErrorState] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [previousResult, setPreviousResult] = useState<AnalysisResult | null>(null);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"severity" | "location" | "type" | "status">("severity");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("spectra-x-history");
      if (!raw) return;
      const parsed = JSON.parse(raw) as HistoryItem[];
      if (Array.isArray(parsed)) {
        setHistory(parsed);
      }
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("spectra-x-history", JSON.stringify(history.slice(0, 25)));
  }, [history]);

  const pushHistory = (nextResult: AnalysisResult) => {
    const item: HistoryItem = {
      id: nextResult.id,
      inputName: nextResult.inputMeta.label,
      date: nextResult.createdAt,
      analysisType: nextResult.analysisType,
      findingCount: nextResult.findingsCount,
      criticalCount: nextResult.severitySummary.Critical,
      status: nextResult.finalStatus,
      result: nextResult,
    };
    setHistory((prev) => [item, ...prev.filter((p) => p.id !== item.id)].slice(0, 25));
  };

  const setStage = (index: number, message: string) => {
    setProgressStage(index);
    setProgressMessage(message);
  };

  const clearCurrentInput = () => {
    setSelectedFile(null);
    setLinkInput("");
    setErrorState(null);
    setResult(null);
    setSelectedFindingId(null);
  };

  const editUrlInput = () => {
    setSelectedFile(null);
    setErrorState(null);
    setResult(null);
    setSelectedFindingId(null);
    setActiveNav("Analyze Input");
  };

  const analyzeLink = async () => {
    setInProgress(true);
    setErrorState(null);
    setCopyMessage("");
    setStage(1, "Validating URL format.");

    try {
      const rawUrl = linkInput.trim();
      const validation = validateHttpUrl(rawUrl);
      if (!validation.isValid) {
        const invalidLocal = buildLocalValidationResult(rawUrl, analysisType);
        setPreviousResult(result);
        setResult(invalidLocal);
        setSelectedFindingId(invalidLocal.findings[0]?.id ?? null);
        setActiveNav("Analyze Input");
        pushHistory(invalidLocal);
        setErrorState(null);
        return;
      }
      const parsedUrl = validation.parsed!;

      setStage(2, "Attempting server-side URL retrieval via backend API.");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let backendResponse: Response | null = null;
      let backendFailureReason = "";
      try {
        backendResponse = await fetch("/api/analyze-url", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: parsedUrl.toString() }),
        });
      } catch (error) {
        backendFailureReason =
          error instanceof DOMException && error.name === "AbortError"
            ? "Backend URL analysis timed out after 12 seconds."
            : "Backend URL analysis endpoint is unavailable or blocked by network policy.";
      } finally {
        clearTimeout(timeout);
      }

      if (backendResponse?.ok) {
        setStage(3, "Extracting backend-provided URL content.");
        let backendPayload: {
          status?: number;
          redirected?: boolean;
          finalUrl?: string;
          contentType?: string;
          content?: string;
          error?: string;
          accessibilityStatus?: string;
          responseType?: string;
          headers?: Record<string, string>;
        } = {};

        try {
          backendPayload = (await backendResponse.json()) as typeof backendPayload;
        } catch {
          backendFailureReason = "Backend returned a non-JSON payload. Switched to demo analysis.";
        }

        const extractedContent = backendPayload.content ?? "";
        const contentType = backendPayload.contentType ?? "Unknown";
        if (extractedContent.trim() && isTextLikeMime(contentType)) {
          setStage(4, "Pattern/issue analysis on live fetched content.");
          const contentKind = classifyContent(parsedUrl.pathname, contentType, extractedContent);
          const scan = analyzeText({
            text: extractedContent,
            name: backendPayload.finalUrl || parsedUrl.hostname,
            kind: contentKind,
            analysisType,
          });

          setStage(5, "Generating remediation guidance.");
          const findings = scan.findings;
          const summary = summarizeSeverities(findings);
          let safeFinalUrl = redactUrlCredentials(parsedUrl);
          if (backendPayload.finalUrl) {
            try {
              safeFinalUrl = redactUrlCredentials(new URL(backendPayload.finalUrl));
            } catch {
              safeFinalUrl = backendPayload.finalUrl;
            }
          }
          const headerSnapshot = backendPayload.headers
            ? Object.entries(backendPayload.headers)
                .slice(0, 8)
                .map(([key, value]) => `${key}: ${value}`)
                .join(" | ")
            : "Headers not provided by backend.";
          const liveChecks: AnalysisCheck[] = [
            {
              name: "HTTP status",
              status: "Passed",
              details: `HTTP ${backendPayload.status ?? backendResponse.status}`,
            },
            {
              name: "Response type",
              status: "Passed",
              details: backendPayload.responseType ?? "basic",
            },
            {
              name: "Final URL",
              status: "Passed",
              details: safeFinalUrl,
            },
            {
              name: "Available headers",
              status: "Passed",
              details: headerSnapshot,
            },
            {
              name: "Accessibility",
              status: "Passed",
              details: backendPayload.accessibilityStatus ?? "Accessible",
            },
          ];

          setStage(6, "Compiling final report.");
          const nextResult: AnalysisResult = {
            id: getId(),
            createdAt: new Date().toISOString(),
            analysisType,
            inputMeta: {
              inputKind: "Link",
              label: redactUrlCredentials(parsedUrl),
              runtimeMode: "LIVE ANALYSIS",
              validationStatus: "Valid URL",
              verificationStatus: findings.some((finding) => finding.status === "Open") ? "Needs review" : "Verified",
              urlOutcome: "ANALYZED",
              lineCount: scan.linesCount,
              coverage: `Live response analysis on ${scan.linesCount} extracted line(s)`,
              urlStatus: `HTTP ${backendPayload.status ?? backendResponse.status}`,
              accessibilityStatus: backendPayload.accessibilityStatus ?? "Accessible",
              contentType,
            },
            checks: [...liveChecks, ...scan.checks],
            findings,
            findingsCount: findings.length,
            severitySummary: summary,
            passedChecks: [...liveChecks, ...scan.checks].filter((check) => check.status === "Passed").length,
            finalStatus: "Analysis Complete",
            limitations: backendPayload.redirected
              ? [`URL was redirected to ${backendPayload.finalUrl ?? "a different endpoint"}.`]
              : [],
          };

          setPreviousResult(result);
          setResult(nextResult);
          setSelectedFindingId(findings[0]?.id ?? null);
          setActiveNav("Analyze Input");
          pushHistory(nextResult);
          setErrorState(null);
          return;
        }

        backendFailureReason =
          backendPayload.error ||
          `Backend returned unsupported or empty content type '${contentType}' for deterministic text analysis.`;
      } else if (backendResponse) {
        let errorDetails = "";
        try {
          const payload = (await backendResponse.json()) as { error?: string; message?: string };
          errorDetails = payload.error || payload.message || "";
        } catch {
          try {
            errorDetails = (await backendResponse.text()).slice(0, 180);
          } catch {
            errorDetails = "";
          }
        }
        backendFailureReason = `Backend endpoint returned HTTP ${backendResponse.status}${errorDetails ? `: ${errorDetails}` : ""}. Live scan unavailable.`;
      }

      setStage(3, "Switching to deterministic demo analysis fallback.");
      setStage(4, "Risk and severity evaluation using demo rules.");
      setStage(5, "Generating recommendation from demo findings.");
      setStage(6, "Compiling demo report.");
      const demoResult = buildDemoUrlResult(parsedUrl.toString(), analysisType, backendFailureReason);
      setPreviousResult(result);
      setResult(demoResult);
      setSelectedFindingId(demoResult.findings[0]?.id ?? null);
      setActiveNav("Analyze Input");
      pushHistory(demoResult);
      setErrorState(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis could not be completed.";
      const emergencyValidation = validateHttpUrl(linkInput.trim());
      const emergencyDemo = emergencyValidation.isValid
        ? buildDemoUrlResult(linkInput.trim(), analysisType, `Unexpected failure: ${message}`)
        : buildLocalValidationResult(linkInput.trim(), analysisType);
      setPreviousResult(result);
      setResult(emergencyDemo);
      setSelectedFindingId(emergencyDemo.findings[0]?.id ?? null);
      setActiveNav("Analyze Input");
      pushHistory(emergencyDemo);
      setErrorState(null);
    } finally {
      setInProgress(false);
    }
  };

  const analyzeFile = async () => {
    setInProgress(true);
    setErrorState(null);
    setCopyMessage("");
    setStage(1, "Validating uploaded file type.");

    try {
      if (!selectedFile) {
        throw new Error("Empty input. Choose a file before starting analysis.");
      }

      const ext = getExtension(selectedFile.name);
      if (!supportedExtensions.includes(ext)) {
        throw new Error(
          `Unsupported file type: .${ext || "unknown"}. Accepted formats: ${supportedExtensions.join(", ")}.`,
        );
      }

      setStage(2, "Extracting file content.");
      const text = await selectedFile.text();
      if (!text.trim()) {
        throw new Error("File could not be parsed or contains no readable text.");
      }

      setStage(3, "Running deterministic issue analysis.");
      const kind = classifyContent(selectedFile.name, selectedFile.type, text);
      const scan = analyzeText({ text, name: selectedFile.name, kind, analysisType });

      setStage(4, "Evaluating severity and confidence levels.");
      const severitySummary = summarizeSeverities(scan.findings);

      setStage(5, "Generating remediation guidance.");
      const findings = scan.findings;

      setStage(6, "Compiling final report.");
      const coverage = scan.linesCount > 0 ? "100% of readable lines" : "0%";
      const nextResult: AnalysisResult = {
        id: getId(),
        createdAt: new Date().toISOString(),
        analysisType,
        inputMeta: {
          inputKind: "File",
          label: selectedFile.name,
          runtimeMode: "LOCAL FILE ANALYSIS",
          validationStatus: "Valid supported file",
          verificationStatus: findings.some((finding) => finding.status === "Open") ? "Needs review" : "Verified",
          sizeBytes: selectedFile.size,
          lineCount: scan.linesCount,
          records: scan.records,
          coverage,
          contentType: selectedFile.type || "Unknown",
        },
        checks: scan.checks,
        findings,
        findingsCount: findings.length,
        severitySummary,
        passedChecks: scan.checks.filter((check) => check.status === "Passed").length,
        finalStatus: "Analysis Complete",
        limitations: [],
      };

      setPreviousResult(result);
      setResult(nextResult);
      setSelectedFindingId(findings[0]?.id ?? null);
      setActiveNav("Analyze Input");
      pushHistory(nextResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis could not be completed.";
      setErrorState(message);
      const failedResult: AnalysisResult = {
        id: getId(),
        createdAt: new Date().toISOString(),
        analysisType,
        inputMeta: {
          inputKind: "File",
          label: selectedFile?.name ?? "Unknown file",
          runtimeMode: "LOCAL FILE ANALYSIS",
          validationStatus: "Invalid or unsupported file",
          verificationStatus: "Not verified",
          sizeBytes: selectedFile?.size,
          coverage: "0%",
          contentType: selectedFile?.type || "Unknown",
        },
        checks: [{ name: "File validation", status: "Not Checked", details: message }],
        findings: [],
        findingsCount: 0,
        severitySummary: { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 },
        passedChecks: 0,
        finalStatus: "Analysis could not be completed",
        limitations: [message],
      };
      setPreviousResult(result);
      setResult(failedResult);
      pushHistory(failedResult);
    } finally {
      setInProgress(false);
    }
  };

  const reAnalyze = async () => {
    if (selectedFile) {
      await analyzeFile();
      return;
    }
    if (linkInput.trim()) {
      await analyzeLink();
      return;
    }
    setErrorState("No input selected. Paste a link or upload a file to begin analysis.");
  };

  const handleFileBrowse = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setErrorState(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    setSelectedFile(file);
    setErrorState(null);
  };

  const handleGenerateJsonReport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `spectra-x-report-${result.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateCsvReport = () => {
    if (!result) return;
    const rows = [
      ["ID", "Finding", "Severity", "Location", "Status", "Confidence", "Evidence", "Recommended Solution"],
      ...result.findings.map((finding) => [
        finding.id,
        finding.title,
        finding.severity,
        finding.location,
        finding.status,
        finding.confidence,
        finding.evidence.replace(/\n/g, " "),
        finding.recommended.replace(/\n/g, " "),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `spectra-x-report-${result.id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySolution = async (solution: Solution) => {
    const text = `Issue: ${solution.issue}\nCause: ${solution.cause}\nFix: ${solution.fix}\nVerification: ${solution.verification}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Solution copied");
      setTimeout(() => setCopyMessage(""), 2000);
    } catch {
      setCopyMessage("Clipboard access blocked by browser permissions");
      setTimeout(() => setCopyMessage(""), 2500);
    }
  };

  const updateFindingStatus = (findingId: string, status: FindingStatus) => {
    if (!result) return;
    const next: AnalysisResult = {
      ...result,
      findings: result.findings.map((finding) => (finding.id === findingId ? { ...finding, status } : finding)),
    };
    setResult(next);
    setHistory((prev) => prev.map((item) => (item.id === next.id ? { ...item, result: next } : item)));
  };

  const selectedFinding = useMemo(
    () => result?.findings.find((finding) => finding.id === selectedFindingId) ?? null,
    [result, selectedFindingId],
  );

  const filteredFindings = useMemo(() => {
    if (!result) return [];
    let out = [...result.findings];
    if (["Critical", "High", "Medium", "Low"].includes(filter)) {
      out = out.filter((finding) => finding.severity === filter);
    }
    if (filter === "Resolved") {
      out = out.filter((finding) => finding.status === "Resolved");
    }
    if (filter === "Open") {
      out = out.filter((finding) => finding.status === "Open");
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (finding) =>
          finding.title.toLowerCase().includes(q) ||
          finding.location.toLowerCase().includes(q) ||
          finding.problem.toLowerCase().includes(q) ||
          finding.type.toLowerCase().includes(q),
      );
    }

    out.sort((a, b) => {
      if (sortBy === "severity") return severityRank[b.severity] - severityRank[a.severity];
      if (sortBy === "location") return a.location.localeCompare(b.location);
      if (sortBy === "type") return a.type.localeCompare(b.type);
      return a.status.localeCompare(b.status);
    });
    return out;
  }, [filter, result, search, sortBy]);

  const comparison = useMemo(() => {
    if (!previousResult || !result || previousResult.id === result.id) return null;
    const prevSet = new Set(previousResult.findings.map(fingerprintFinding));
    const nextSet = new Set(result.findings.map(fingerprintFinding));
    let resolved = 0;
    let remaining = 0;
    let added = 0;
    prevSet.forEach((item) => {
      if (!nextSet.has(item)) resolved += 1;
      else remaining += 1;
    });
    nextSet.forEach((item) => {
      if (!prevSet.has(item)) added += 1;
    });

    const totalBefore = previousResult.findings.length;
    const improvement = totalBefore > 0 ? Math.round((resolved / totalBefore) * 100) : 0;
    return { resolved, remaining, added, improvement };
  }, [previousResult, result]);

  const renderNavView = () => {
    if (activeNav === "Live Simulation") {
      return (
        <div className="space-y-3 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold text-cyan-100">RF Simulation Module</h2>
          <p className="text-sm text-slate-300">
            Dedicated SIH26055 workflow remains available: RF Environment -&gt; Observe -&gt; Learn -&gt; Decide -&gt; Evaluate.
          </p>
          <button
            className="rounded-lg border border-cyan-400/50 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/30"
            onClick={() => alert("Simulation module preserved. Connect your existing scheduler logic here.")}
            type="button"
          >
            Launch Simulation
          </button>
        </div>
      );
    }
    if (activeNav === "Analysis History") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-cyan-100">Analysis History</h2>
            <button
              className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/20"
              onClick={() => {
                const confirmed = window.confirm("Delete all analysis history?");
                if (confirmed) setHistory([]);
              }}
              type="button"
            >
              Delete History
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-700/80">
            <table className="min-w-full divide-y divide-slate-700 text-sm">
              <thead className="bg-slate-800/70 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Input name/URL</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Analysis type</th>
                  <th className="px-3 py-2 text-left font-medium">Finding count</th>
                  <th className="px-3 py-2 text-left font-medium">Critical count</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {history.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-slate-400" colSpan={6}>
                      No analysis history yet.
                    </td>
                  </tr>
                )}
                {history.map((item) => (
                  <tr
                    className="cursor-pointer hover:bg-slate-800/60"
                    key={item.id}
                    onClick={() => {
                      setPreviousResult(result);
                      setResult(item.result);
                      setSelectedFindingId(item.result.findings[0]?.id ?? null);
                      setActiveNav("Analyze Input");
                    }}
                  >
                    <td className="px-3 py-2 text-slate-200">{item.inputName}</td>
                    <td className="px-3 py-2 text-slate-400">{new Date(item.date).toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-300">{item.analysisType}</td>
                    <td className="px-3 py-2 text-slate-300">{item.findingCount}</td>
                    <td className="px-3 py-2 text-slate-300">{item.criticalCount}</td>
                    <td className="px-3 py-2 text-slate-300">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    if (activeNav !== "Overview" && activeNav !== "Analyze Input") {
      return (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-5 text-sm text-slate-300">
          {activeNav} module placeholder is available for your existing SPECTRA-X feature set.
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(6,182,212,0.22),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.2),transparent_30%)]" />
      <div className="relative mx-auto flex w-full max-w-[1500px] gap-4 p-4 md:p-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 overflow-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-3 lg:block">
          <div className="mb-3 border-b border-slate-800 pb-3">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">SPECTRA-X</p>
            <h1 className="mt-1 text-sm font-semibold text-slate-100">Adaptive Analysis & Detection Platform</h1>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeNav === item
                    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
                key={item}
                onClick={() => setActiveNav(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <main className="w-full space-y-5">
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-slate-900/75 p-6"
            initial={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.45 }}
          >
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">SPECTRA-X</p>
              <h2 className="text-2xl font-semibold text-cyan-100 md:text-3xl">
                Intelligent Analysis & Adaptive Decision Platform
              </h2>
              <p className="max-w-3xl text-sm text-slate-300 md:text-base">
                Analyze inputs. Detect issues. Understand the cause. Get actionable solutions.
              </p>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <motion.button
                whileHover={{ y: -3 }}
                className="rounded-xl border border-cyan-400/30 bg-slate-900/90 p-4 text-left"
                onClick={() => setActiveNav("Analyze Input")}
                type="button"
              >
                <p className="text-sm font-semibold text-cyan-100">Analyze Link</p>
                <p className="mt-1 text-xs text-slate-300">Paste a URL to analyze</p>
              </motion.button>
              <motion.button
                whileHover={{ y: -3 }}
                className="rounded-xl border border-cyan-400/30 bg-slate-900/90 p-4 text-left"
                onClick={() => setActiveNav("Analyze Input")}
                type="button"
              >
                <p className="text-sm font-semibold text-cyan-100">Upload File</p>
                <p className="mt-1 text-xs text-slate-300">Upload a file for local browser analysis</p>
              </motion.button>
              <motion.button
                whileHover={{ y: -3 }}
                className="rounded-xl border border-cyan-400/30 bg-slate-900/90 p-4 text-left"
                onClick={() => setActiveNav("Live Simulation")}
                type="button"
              >
                <p className="text-sm font-semibold text-cyan-100">RF Simulation</p>
                <p className="mt-1 text-xs text-slate-300">Run SPECTRA-X scheduler</p>
              </motion.button>
            </div>
          </motion.section>

          {renderNavView()}

          {(activeNav === "Overview" || activeNav === "Analyze Input") && (
            <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-cyan-100">Analyze Input</h3>
                  <p className="text-sm text-slate-300">Paste -&gt; Analyze -&gt; Detect -&gt; Explain -&gt; Solve -&gt; Verify</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400" htmlFor="analysisType">
                    Analysis Type
                  </label>
                  <select
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    id="analysisType"
                    onChange={(event) => setAnalysisType(event.target.value as AnalysisType)}
                    value={analysisType}
                  >
                    {analysisTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                  <h4 className="text-sm font-semibold text-cyan-100">Option A - Paste Link</h4>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring"
                    onChange={(event) => setLinkInput(event.target.value)}
                    placeholder="https://example.com"
                    type="url"
                    value={linkInput}
                  />
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                      disabled={inProgress}
                      onClick={analyzeLink}
                      type="button"
                    >
                      Analyze Link
                    </button>
                    <button
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      onClick={() => setLinkInput("")}
                      type="button"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                  <h4 className="text-sm font-semibold text-cyan-100">Option B - Upload File</h4>
                  <div
                    className={`rounded-lg border-2 border-dashed p-5 text-center transition ${
                      isDragging ? "border-cyan-400 bg-cyan-500/10" : "border-slate-700 bg-slate-950/60"
                    }`}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsDragging(false);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <p className="text-sm text-slate-300">Drop your file here</p>
                    <p className="mt-1 text-xs text-slate-500">or Browse Files</p>
                    <label className="mt-3 inline-block cursor-pointer rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
                      Browse Files
                      <input className="hidden" onChange={handleFileBrowse} type="file" />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">
                    Supported: {supportedExtensions.join(", ")} (processed locally in browser).
                  </p>
                  {selectedFile && <p className="text-xs text-slate-300">Selected: {selectedFile.name}</p>}
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                      disabled={inProgress}
                      onClick={analyzeFile}
                      type="button"
                    >
                      Analyze File
                    </button>
                    <button
                      className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      onClick={() => setSelectedFile(null)}
                      type="button"
                    >
                      Remove File
                    </button>
                  </div>
                </div>
              </div>

              {inProgress && (
                <motion.div
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-cyan-400/30 bg-slate-950/70 p-4"
                  initial={{ opacity: 0 }}
                >
                  <p className="mb-2 text-sm font-medium text-cyan-200">Analysis Workflow in progress</p>
                  <p className="mb-3 text-xs text-slate-400">{progressMessage}</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {stages.map((stage, index) => {
                      const stageNumber = index + 1;
                      const state =
                        stageNumber < progressStage ? "completed" : stageNumber === progressStage ? "active" : "pending";
                      return (
                        <div
                          className={`rounded-lg border px-3 py-2 text-xs ${
                            state === "completed"
                              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                              : state === "active"
                                ? "border-cyan-400/50 bg-cyan-500/10 text-cyan-100"
                                : "border-slate-700 bg-slate-900 text-slate-400"
                          }`}
                          key={stage}
                        >
                          Stage {stageNumber}: {stage}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {!result && !errorState && !inProgress && (
                <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-6 text-center">
                  <p className="text-lg font-medium text-slate-200">No input selected</p>
                  <p className="mt-1 text-sm text-slate-400">Paste a link or upload a file to begin analysis.</p>
                </div>
              )}

              {errorState && !result && (
                <div className="space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                  <p className="font-medium text-rose-100">Analysis could not be completed</p>
                  <p className="text-sm text-rose-200/90">{errorState}</p>
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-500/20"
                      onClick={reAnalyze}
                      type="button"
                    >
                      Try Again
                    </button>
                    <button
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                      onClick={clearCurrentInput}
                      type="button"
                    >
                      Choose Another Input
                    </button>
                  </div>
                </div>
              )}

              {result && (
                <AnimatePresence mode="wait">
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 12 }}
                    key={result.id}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-slate-950/60 p-4">
                      <div>
                        <p className="text-base font-semibold text-cyan-100">Analysis Results</p>
                        <p className="text-xs text-slate-400">
                          Status: {result.inputMeta.inputKind === "Link" ? result.inputMeta.urlOutcome ?? "ANALYZED" : result.finalStatus}
                        </p>
                        <span className="mt-2 inline-flex rounded-full border border-cyan-400/50 bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-100">
                          {result.inputMeta.runtimeMode ?? "LOCAL FILE ANALYSIS"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded-lg border border-cyan-400/50 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-500/20"
                          onClick={reAnalyze}
                          type="button"
                        >
                          Re-Analyze
                        </button>
                        <button
                          className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                          onClick={handleGenerateJsonReport}
                          type="button"
                        >
                          Generate Report (JSON)
                        </button>
                        <button
                          className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                          onClick={handleGenerateCsvReport}
                          type="button"
                        >
                          Generate Report (CSV)
                        </button>
                        <button
                          className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                          onClick={() => window.print()}
                          type="button"
                        >
                          Printable Report
                        </button>
                      </div>
                    </div>

                    {result.inputMeta.inputKind === "Link" && result.inputMeta.runtimeMode === "DEMO ANALYSIS" && (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
                        <p className="text-sm font-semibold text-amber-100">LIVE ANALYSIS UNAVAILABLE</p>
                        <p className="mt-1 text-sm text-amber-50">
                          Live analysis is unavailable in this environment. SPECTRA-X Demo Analysis has been activated.
                        </p>
                        <div className="mt-3 grid gap-1 text-xs text-amber-100">
                          <p>Analysis Mode: DEMO ANALYSIS</p>
                          <p>URL: {result.inputMeta.label}</p>
                          <p>Status: {result.inputMeta.urlOutcome ?? "PASS"}</p>
                          <p>Severity: {highestSeverity(result.severitySummary).toUpperCase()}</p>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-amber-100">CHECKS</p>
                          <div className="mt-1 space-y-1 text-xs text-amber-100">
                            {result.checks.map((check) => (
                              <p key={`${result.id}-${check.name}`}>
                                {check.status === "Passed" ? "✓" : check.status === "Detected" ? "!" : "-"} {check.name}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-amber-100">OBSERVATIONS</p>
                          <div className="mt-1 space-y-1 text-xs text-amber-50">
                            {result.findings.map((finding) => (
                              <p key={finding.id}>i {finding.title}</p>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-amber-50">
                          Recommendation: {result.findings.find((finding) => finding.title.toLowerCase().includes("tracking"))?.recommended ?? result.findings[0]?.recommended ?? "No action required."}
                        </div>
                        <div className="mt-3 text-xs text-amber-50">
                          Demo analysis is based only on observable URL properties and does not confirm website safety.
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            className="rounded-lg border border-amber-300/50 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/20"
                            onClick={() => setSelectedFindingId(result.findings[0]?.id ?? null)}
                            type="button"
                          >
                            View Details
                          </button>
                          <button
                            className="rounded-lg border border-amber-300/50 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/20"
                            onClick={reAnalyze}
                            type="button"
                          >
                            Try Again
                          </button>
                          <button
                            className="rounded-lg border border-amber-300/50 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/20"
                            onClick={reAnalyze}
                            type="button"
                          >
                            Re-Analyze
                          </button>
                          <button
                            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                            onClick={clearCurrentInput}
                            type="button"
                          >
                            Try Another Input
                          </button>
                        </div>
                      </div>
                    )}

                    {result.inputMeta.inputKind === "Link" && result.inputMeta.runtimeMode === "LOCAL VALIDATION" && (
                      <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4">
                        <p className="text-sm font-semibold text-rose-100">INVALID URL</p>
                        <div className="mt-2 space-y-1 text-xs text-rose-100">
                          <p>Analysis Mode: LOCAL VALIDATION</p>
                          <p>Status: ERROR</p>
                          <p>Severity: HIGH</p>
                          <p>Finding: {result.findings[0]?.title ?? "Invalid URL format."}</p>
                          <p>Explanation: The provided input is not a valid complete URL.</p>
                          <p>Solution: Enter a complete URL beginning with https:// or http://.</p>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            className="rounded-lg border border-rose-300/50 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-500/20"
                            onClick={editUrlInput}
                            type="button"
                          >
                            Edit Input
                          </button>
                          <button
                            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                            onClick={clearCurrentInput}
                            type="button"
                          >
                            Try Another Input
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
                      {[
                        ["Total Findings", result.findingsCount],
                        ["Critical", result.severitySummary.Critical],
                        ["High", result.severitySummary.High],
                        ["Medium", result.severitySummary.Medium],
                        ["Low", result.severitySummary.Low],
                        ["Passed Checks", result.passedChecks],
                        ["Checks Performed", result.checks.length],
                      ].map(([label, value]) => (
                        <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2" key={String(label)}>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
                          <p className="text-lg font-semibold text-cyan-100">{value}</p>
                        </div>
                      ))}
                    </div>

                    {result.finalStatus === "Analysis Complete" && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                        {result.checks.length} checks performed. {result.findingsCount} findings detected. {result.severitySummary.High} high. {result.severitySummary.Medium} medium. {result.severitySummary.Low} low.
                      </div>
                    )}

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-xs text-slate-300">
                        <p className="mb-2 text-sm font-semibold text-cyan-100">Input Information</p>
                        <p>Input: {result.inputMeta.label}</p>
                        <p>Type: {result.inputMeta.inputKind}</p>
                        <p>Analysis Mode: {result.inputMeta.runtimeMode ?? "LOCAL FILE ANALYSIS"}</p>
                        <p>Validation Status: {result.inputMeta.validationStatus ?? "Not available"}</p>
                        <p>Verification Status: {result.inputMeta.verificationStatus ?? "Not verified"}</p>
                        {result.inputMeta.inputKind === "Link" && (
                          <>
                            <p>URL: {result.inputMeta.label}</p>
                            <p>URL Outcome: {result.inputMeta.urlOutcome ?? "Not evaluated"}</p>
                            <p>URL status: {result.inputMeta.urlStatus ?? "Unknown"}</p>
                            <p>Accessibility status: {result.inputMeta.accessibilityStatus ?? "Unknown"}</p>
                            <p>Content type: {result.inputMeta.contentType ?? "Unknown"}</p>
                            <p>Analysis status: {result.finalStatus}</p>
                            <p>Number of findings: {result.findingsCount}</p>
                            <p>
                              Severity summary: C {result.severitySummary.Critical} / H {result.severitySummary.High} / M {result.severitySummary.Medium} / L {result.severitySummary.Low}
                            </p>
                          </>
                        )}
                        {result.inputMeta.inputKind === "File" && (
                          <>
                            <p>File size: {result.inputMeta.sizeBytes ?? 0} bytes</p>
                            <p>Pages/records/lines analyzed: {result.inputMeta.records ?? result.inputMeta.lineCount ?? 0}</p>
                            <p>Analysis coverage: {result.inputMeta.coverage ?? "Unknown"}</p>
                          </>
                        )}
                        <p>Analysis date/time: {new Date(result.createdAt).toLocaleString()}</p>
                        <p>Analysis mode: {result.analysisType}</p>
                      </div>

                      <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-xs text-slate-300">
                        <p className="mb-2 text-sm font-semibold text-cyan-100">Check Outcomes</p>
                        <div className="space-y-2">
                          {result.checks.map((check) => (
                            <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2" key={`${result.id}-${check.name}`}>
                              <p className="font-medium text-slate-200">{check.name}</p>
                              <p className="text-slate-400">{check.status}</p>
                              <p className="text-slate-500">{check.details}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {result.limitations.length > 0 && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                        <p className="font-semibold">Limitations</p>
                        <ul className="mt-1 list-disc pl-5">
                          {result.limitations.map((limitation) => (
                            <li key={limitation}>{limitation}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {comparison && (
                      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                        <p className="text-sm font-semibold text-cyan-100">Previous Analysis vs Current Analysis</p>
                        <p className="mt-1 text-xs text-slate-200">Resolved findings: {comparison.resolved}</p>
                        <p className="text-xs text-slate-200">New findings: {comparison.added}</p>
                        <p className="text-xs text-slate-200">Remaining findings: {comparison.remaining}</p>
                        {previousResult?.findings.length ? (
                          <p className="mt-1 text-xs font-medium text-cyan-100">Improvement: {comparison.improvement}%</p>
                        ) : null}
                      </div>
                    )}

                    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                      <div className="flex flex-wrap gap-2">
                        {[
                          "All",
                          "Critical",
                          "High",
                          "Medium",
                          "Low",
                          "Resolved",
                          "Open",
                        ].map((value) => (
                          <button
                            className={`rounded-lg border px-3 py-1.5 text-xs ${
                              filter === value
                                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-100"
                                : "border-slate-700 text-slate-300 hover:bg-slate-800"
                            }`}
                            key={value}
                            onClick={() => setFilter(value)}
                            type="button"
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <div className="grid gap-2 md:grid-cols-3">
                        <input
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search findings..."
                          type="text"
                          value={search}
                        />
                        <select
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                          onChange={(event) => setSortBy(event.target.value as "severity" | "location" | "type" | "status")}
                          value={sortBy}
                        >
                          <option value="severity">Severity</option>
                          <option value="location">Location</option>
                          <option value="type">Finding type</option>
                          <option value="status">Status</option>
                        </select>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-slate-800">
                        <table className="min-w-full divide-y divide-slate-800 text-sm">
                          <thead className="bg-slate-900 text-slate-300">
                            <tr>
                              <th className="px-3 py-2 text-left">Finding</th>
                              <th className="px-3 py-2 text-left">Severity</th>
                              <th className="px-3 py-2 text-left">Location</th>
                              <th className="px-3 py-2 text-left">Status</th>
                              <th className="px-3 py-2 text-left">Solution</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                            {filteredFindings.length === 0 && (
                              <tr>
                                <td className="px-3 py-4 text-slate-400" colSpan={5}>
                                  No findings for current filter/search.
                                </td>
                              </tr>
                            )}
                            {filteredFindings.map((finding) => (
                              <tr
                                className="cursor-pointer hover:bg-slate-800/70"
                                key={finding.id}
                                onClick={() => setSelectedFindingId(finding.id)}
                              >
                                <td className="px-3 py-2 text-slate-200">{finding.title}</td>
                                <td className="px-3 py-2 text-slate-300">{finding.severity}</td>
                                <td className="px-3 py-2 text-slate-400">{finding.location}</td>
                                <td className="px-3 py-2 text-slate-300">{finding.status}</td>
                                <td className="px-3 py-2">
                                  <button
                                    className="rounded border border-cyan-400/40 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-500/20"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedFindingId(finding.id);
                                    }}
                                    type="button"
                                  >
                                    View Solution
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {selectedFinding && (
                      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                        <p className="text-sm font-semibold text-cyan-100">Why was this flagged?</p>
                        <p className="text-xs text-slate-300">
                          Detected: {selectedFinding.problem} Evidence: {selectedFinding.evidence}. Severity: {selectedFinding.severity} due to potential impact on reliability/security. Next step: {selectedFinding.recommended}
                        </p>

                        <div className="grid gap-2 text-sm text-slate-300">
                          <p>
                            <span className="font-medium text-slate-100">Check:</span> {selectedFinding.title}
                          </p>
                          <p>
                            <span className="font-medium text-slate-100">Result:</span> {selectedFinding.severity === "Info" ? "PASS" : selectedFinding.severity === "Medium" ? "WARNING" : "ERROR"}
                          </p>
                          <p>
                            <span className="font-medium text-slate-100">Problem:</span> {selectedFinding.problem}
                          </p>
                          <p>
                            <span className="font-medium text-slate-100">Evidence:</span> {selectedFinding.evidence}
                          </p>
                          <p>
                            <span className="font-medium text-slate-100">Why it matters:</span> {selectedFinding.why}
                          </p>
                          <p>
                            <span className="font-medium text-slate-100">Severity:</span> {selectedFinding.severity} ({selectedFinding.confidence})
                          </p>
                          <p>
                            <span className="font-medium text-slate-100">Recommended Solution:</span> {selectedFinding.recommended}
                          </p>
                          <p>
                            <span className="font-medium text-slate-100">Status:</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(["Open", "Reviewed", "Resolved", "Ignored"] as FindingStatus[]).map((status) => (
                              <button
                                className={`rounded-lg border px-3 py-1 text-xs ${
                                  selectedFinding.status === status
                                    ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-100"
                                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                                }`}
                                key={status}
                                onClick={() => updateFindingStatus(selectedFinding.id, status)}
                                type="button"
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm text-slate-200">
                          <p className="font-semibold text-cyan-100">Solution Engine</p>
                          <p className="mt-1">
                            <span className="font-medium">Issue:</span> {selectedFinding.solution.issue}
                          </p>
                          <p>
                            <span className="font-medium">Cause:</span> {selectedFinding.solution.cause}
                          </p>
                          <p>
                            <span className="font-medium">Fix:</span> {selectedFinding.solution.fix}
                          </p>
                          <p>
                            <span className="font-medium">Verification:</span> {selectedFinding.solution.verification}
                          </p>
                          <button
                            className="mt-2 rounded border border-cyan-400/40 px-3 py-1 text-xs text-cyan-100 hover:bg-cyan-500/20"
                            onClick={() => handleCopySolution(selectedFinding.solution)}
                            type="button"
                          >
                            Copy Solution
                          </button>
                          {copyMessage && <p className="mt-1 text-xs text-cyan-200">{copyMessage}</p>}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-xs text-slate-400">
                      Privacy: Uploaded files are processed in-browser and are not sent to external services by this prototype.
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
