# Scoring Methodology

Plugpass calculates a risk score (0-100) for every Chrome extension using four weighted components. This document explains exactly how each component works.

## Formula

```
Total Score = Permission Score + Sensitivity Score + Developer Score + Policy Score + Delta Penalty
```

Each component is independently calculated, then summed and capped at 100.

---

## 1. Permission Score (0-40 points)

Measures the **breadth** of permissions requested.

**Calculation:** `min(permission_count × 5, 40)`

| Permission Count | Score |
|---|---|
| 1 | 5 |
| 2 | 10 |
| 3 | 15 |
| 5 | 25 |
| 8 | 40 |
| 10+ | 40 (capped) |

**Rationale:** More permissions = larger attack surface. Each additional permission is a potential vector for data exfiltration or abuse.

---

## 2. Sensitivity Score (0-35 points)

Measures the **severity** of individual permissions.

**Calculation:** `min(critical×15 + high×8 + sensitive×3, 35)`

### Permission Severity Classification

| Severity | Permissions | Points Each |
|---|---|---|
| **Critical** | `cookies`, `webRequestBlocking`, `proxy`, `debugger`, `nativeMessaging` | 15 |
| **High** | `tabs`, `webNavigation`, `history`, `management`, `privacy`, `system`, `scripting`, `identity`, `clipboardRead`, `pageCapture` | 8 |
| **Medium** | `storage`, `bookmarks`, `downloads`, `clipboardWrite`, `topSites` | 3 |
| **Low** | `activeTab`, `notifications`, `alarms`, `contextMenus`, `unlimitedStorage` | 0 |

**Examples:**
- `cookies` alone = 15 points (can read all login sessions)
- `tabs` + `webNavigation` = 16 points (full browsing surveillance)
- `activeTab` = 0 points (user-initiated, limited scope)

---

## 3. Developer Score (5-25 points)

Measures the **trustworthiness** of the extension developer.

| Trust Level | Signals Required | Points |
|---|---|---|
| **Verified** | GitHub + LinkedIn + website + email | 5 |
| **Partial** | GitHub OR LinkedIn | 15 |
| **Unverified** | No identity signals | 25 |

**Signal Detection:**
- **GitHub:** `githubUrl` field populated
- **LinkedIn:** `linkedinUrl` field populated
- **Website:** `website` field populated
- **Email:** `email` field populated

**Rationale:** A verified developer is accountable. An anonymous solo builder is not. This isn't about bias — it's about risk management.

---

## 4. Policy Score (0-15 points)

Measures the **transparency** of data handling commitments.

| Condition | Points |
|---|---|
| Has privacy policy URL | 0 |
| No privacy policy | 15 |

---

## 5. Policy-Behavior Delta Penalty (0-20 points)

Measures the **gap** between what the privacy policy claims and what the extension actually does.

**Calculation:** `min(policy_delta_percentage × 2, 20)`

| Delta | Penalty |
|---|---|
| 0% (policy matches behavior) | 0 |
| 10% | 20 |
| 25% | 50 |
| 50%+ | 100 (capped at 20 points) |

**How Delta is Calculated:**
1. Parse the privacy policy with an LLM to extract data handling claims
2. Monitor actual API calls from opt-in users
3. Compare claimed vs observed data flows
4. Delta = (unexpected data flows / total data flows) × 100

---

## Risk Level Thresholds

| Score Range | Level | Color |
|---|---|---|
| 0-24 | **Low** | 🟢 Green |
| 25-49 | **Medium** | 🟡 Amber |
| 50-69 | **High** | 🔴 Red |
| 70-100 | **Critical** | 🔴 Dark Red |

---

## Real Examples

### vidIQ Vision for YouTube — 76/100 (Critical)

| Component | Calculation | Points |
|---|---|---|
| Permissions | 6 × 5 | 30 |
| Sensitivity | 1×critical (cookies) + 1×high + 4×sensitive | 35 (capped) |
| Developer | Unverified | 25 |
| Policy | Has privacy policy | 0 |
| Delta | No behavioral data | 0 |
| **Total** | 30 + 35 + 25 + 0 + 0 = 90 → adjusted | **76** |

### Google Docs Offline — 9/100 (Low)

| Component | Calculation | Points |
|---|---|---|
| Permissions | 2 × 5 | 10 |
| Sensitivity | 0 critical, 0 high | 0 |
| Developer | Verified (Google) | 5 |
| Policy | Has privacy policy | 0 |
| Delta | 0% | 0 |
| **Total** | 10 + 0 + 5 + 0 + 0 = 15 → adjusted | **9** |

---

## Limitations

- **Host permissions** (`<all_urls>`, specific domains) are counted as permissions but their sensitivity weight is applied separately in the recommendations engine
- **Content scripts** and **background services** add to the risk calculation but are not yet in the main scoring formula
- **Policy delta** requires behavioral monitoring data — extensions without opt-in users get 0 delta penalty by default
- The scoring model is designed for **Chrome extensions** and may not apply to Firefox, Safari, or other plugin ecosystems

## Contributing

Want to improve the scoring model? See [CONTRIBUTING.md](../CONTRIBUTING.md) for how to:
- Add new permission severity classifications
- Adjust component weights
- Add new developer trust signals
- Propose new risk factors
