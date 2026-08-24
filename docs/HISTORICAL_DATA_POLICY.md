# Historical market-data policy

**Policy date:** 2026-08-24

**Status:** normative licensing and publication gate

**Scope:** frozen historical datasets, replay scenarios and checksum-bound paper execution; never
live or delayed runtime feeds

This document records a conservative engineering assessment, not legal advice. Provider products,
prices, exchange entitlements, and terms can change. An assessment below is evidence only for the
dated review. It is not a substitute for an executed order form or permission covering the exact
dataset and use.

ChartPath currently bundles **no real historical candles**. The canonical historical-data path is
demonstrated with generated synthetic development data. That fixture must remain visibly labelled
`development-only`, must not masquerade as a reviewed real-market scenario, and must not award the
ordinary published-course mastery or XP projections.

Milestone 4 may process that same generated fixture through a local deterministic paper-execution
model. Doing so does not change its licensing, editorial, publication or course-credit status. A
simulated fill is derived development evidence, not proof that the underlying dataset may be
published and not permission to capture or redistribute real provider values.

## 1. Rights and status vocabulary

These states are deliberately separate. A technically valid dataset is not necessarily publishable.

| State                   | Meaning                                                                                                                                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Verified permission** | A dated, retained primary-source license, order form, or provider record expressly covers the exact dataset, the intended organization, external application display, bundling or redistribution, required retention period, attribution, derived-data use, and applicable upstream exchange rights. |
| **Requires agreement**  | The public terms allow only internal/personal use or say redistribution needs an add-on, commercial plan, order form, or written permission.                                                                                                                                                         |
| **Unclear**             | The reviewed primary material does not answer a required question. Silence is not permission.                                                                                                                                                                                                        |
| **Blocked**             | The reviewed terms prohibit the intended use, or required permission has not been obtained.                                                                                                                                                                                                          |
| **Development-only**    | Synthetic/generated data, or data whose rights/editorial review are insufficient for a learner release. It may exercise the contract in local development but cannot be presented as publishable real history.                                                                                       |
| **Publishable**         | Both market-data rights and the separate educational/editorial gates pass. Automated tests alone never confer this status.                                                                                                                                                                           |

“Educational,” “free,” “open-source,” “historical,” “delayed,” and “available through an API” do
not by themselves grant redistribution permission. A repository commit, application bundle,
downloadable fixture, screenshot containing recoverable values, or chart delivered to another user
can be distribution even when the app has no purchase price.

## 2. Provider evaluation

The matrix uses only official provider documentation and terms. Prices and limits are snapshots of
the official pages on the policy date and must be rechecked before procurement.

| Provider             | Historical capability and access                                                                                                                                                                                                                                                                                                                                                                                                                                              | Adjustments and actions                                                                                                                                                                                                                                                                                                                     | Use, retention, redistribution, and attribution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | ChartPath decision                                                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alpha Vantage**    | The [official API documentation](https://www.alphavantage.co/documentation/) describes 20+ years of daily, weekly, monthly, and intraday OHLCV. An API key is required. [Official support](https://www.alphavantage.co/support/) states a standard free allowance of 25 requests/day and possible unlimited requests for verified open-source or educational projects; premium endpoints/plans have separate access.                                                          | Intraday can be raw or split/dividend adjusted. Daily Adjusted provides raw OHLCV, adjusted close, and split/dividend events and is identified as premium.                                                                                                                                                                                  | The [Terms of Service](https://www.alphavantage.co/terms_of_service/) grant personal, non-commercial use unless otherwise agreed in writing, define access by other people/entities as commercial in relevant circumstances, and provide a non-sublicensable, non-transferable, revocable license. The reviewed terms do not expressly grant durable caching, app bundling, or redistribution of returned candles. No general redistribution attribution rule was found; a written agreement would need to supply it. Educational rate relief is not a redistribution license.                                                                                                                                                                                                                                 | **Requires agreement / blocked for bundling.** Suitable capabilities, but no real Alpha Vantage candles may be committed without written commercial and redistribution permission, retention terms, attribution terms, and confirmation of upstream rights. |
| **Twelve Data**      | [`/time_series`](https://twelvedata.com/docs) provides intraday and daily history and returns currency, exchange, MIC, and exchange timezone metadata. A key and credit-based plan are required. The [official pricing page](https://twelvedata.com/pricing) listed Basic at no charge with 8 API credits/minute and 800/day, and individual Grow/Pro/Ultra list prices of $79/$229/$999 per month; business and custom rights are separate.                                  | The API documents `all`, `splits`, `dividends`, and `none` adjustment modes, with split adjustment the default. Separate splits and dividends endpoints expose action data. Official support notes that intraday prices are unadjusted while daily/weekly/monthly prices are split-adjusted.                                                | The [Terms of Use](https://twelvedata.com/terms) license data for internal use by default, prohibit Free Tier commercial use, limit caching to documented timeframes, and require a Redistribution Rights Add-On or separate written agreement for external display/redistribution. Third-party exchange agreements, fees, and restrictions may also apply and must be independently verified. Attribution is governed by the applicable right and the [official attribution guidelines](https://support.twelvedata.com/en/articles/12647398-attribution-guidelines-for-using-twelve-data). Derived data must not be reversible to the source data.                                                                                                                                                            | **Requires agreement / blocked for bundling.** Obtain the exact redistribution add-on/order, exchange rights, caching/retention period, and attribution obligation before committing data.                                                                  |
| **Tiingo**           | The [End-of-Day documentation](https://www.tiingo.com/documentation/end-of-day) provides token-authenticated daily raw and adjusted OHLCV plus asset/exchange metadata. Plan limits and prices are published on the [official pricing page](https://www.tiingo.com/about/pricing) and are plan-specific.                                                                                                                                                                      | End-of-day rows include adjusted OHLCV, `divCash`, and `splitFactor`; Tiingo describes split/dividend adjustment and corporate-action checking.                                                                                                                                                                                             | The [Terms of Use](https://api.tiingo.com/tos/) say API data is for internal consumption only and redistribution requires special permission and additional fees. If permission is granted, the default attribution is “Data sourced by Tiingo” linked to Tiingo. Starter/trial use cannot persist data; eligible paid-plan data must be deleted on expiry, cancellation, termination, or downgrade unless a separate agreement provides another retention period. The terms explicitly treat simple OHLCV reformatting, adjustment, timezone changes, and extractable charts/files as prohibited derived products. The [developer program](https://www.tiingo.com/documentation/appendix/developers) offers a bring-your-own-token model, which is not permission to bundle one account’s data for all users. | **Blocked without negotiated rights.** The default retention and derived-product terms are incompatible with committed replay candles. Require express redistribution and permanent-retention terms before reconsideration.                                 |
| **Massive**          | The [Stocks REST documentation](https://massive.com/docs/rest/stocks) covers custom-interval historical aggregate OHLCV, daily data, pre-market/regular/after-hours sessions, and missing bars where no eligible trades occurred. The official docs listed API-key individual tiers at $0/$29/$79/$199 per month; those individual plans do not confer business redistribution rights, and business terms are order-form based.                                               | Aggregate data can be adjusted or unadjusted. The [official adjustment note](https://massive.com/knowledge-base/article/is-massives-stock-data-adjusted-for-splits-or-dividends) states historical stock data is split-adjusted by default but not dividend-adjusted. Separate split and dividend endpoints provide action records/factors. | The [Market Data Terms](https://massive.com/legal/market-data-terms-of-service) limit individual use to personal, non-business, non-commercial purposes, expressly disallow building an application for other end users, prohibit third-party distribution/display of market data and derived works absent permission, and require deletion on termination. Exchange/provider terms can add entitlements. The [business terms](https://massive.com/legal/businesses-terms-of-service) make rights dependent on the exact order form and third-party agreements. No default right to use Massive marks was granted; attribution/notices must follow the executed agreement.                                                                                                                                     | **Blocked without business and exchange agreements.** Individual access cannot support ChartPath bundling. An exact business order must cover external users, bundled history, retention, attribution, and upstream rights.                                 |
| **Nasdaq Data Link** | Historical time-series/API/file coverage, keys, rate limits, and cost vary by the exact free or premium dataset; see the [official getting-started documentation](https://docs.data.nasdaq.com/docs/getting-started). A catalog label such as “free” does not establish redistribution rights.                                                                                                                                                                                | Adjustment and corporate-action coverage are dataset-specific and must be recorded from the selected dataset documentation/order rather than inferred from the platform name.                                                                                                                                                               | The [Data License Terms](https://data.nasdaq.com/terms) grant receipt, use, processing, and storage as detailed in an executed order form, default to internal business use, restrict external distribution of source and derived data unless the order or prior written approval permits it, prohibit unapproved SaaS/redistribution, incorporate third-party-provider terms, require proprietary notices to remain, and generally require deletion when the order ends.                                                                                                                                                                                                                                                                                                                                      | **Requires exact dataset agreement / blocked now.** No generic Nasdaq Data Link series is publishable without dataset-specific rights, costs, retention, attribution, action methodology, and third-party terms.                                            |
| **Databento**        | The [official pricing page](https://databento.com/pricing/) describes 15+ years of historical data, OHLCV at second/minute/hour/day resolutions, API/flat-file delivery, a usage-based option, and subscription tiers. It listed signup credits and, for the displayed futures plans, Standard at $199/month, Plus with external distribution at $1,750/month in license fees, and Unlimited at $4,500/month; these are not universal dataset prices. An API key is required. | [Corporate-actions documentation](https://databento.com/docs/schemas-and-data-formats/corporate-actions) and [adjustment-factor documentation](https://databento.com/docs/venues-and-datasets/adjustment-factors) cover actions and point-in-time adjustment factors, including corrections/rescissions that a frozen import must record.   | The pricing page says redistribution rights depend on the exact dataset, that Databento passes through original-publisher restrictions, and that most datasets can be redistributed internally or externally after 24 hours. The exact Data Catalog/License Manager record governs. A 30-day batch-redownload window is a delivery/billing rule, not proof of permanent repository retention. Attribution, delayed-age, white-label, termination, and derived-data terms remain dataset-specific.                                                                                                                                                                                                                                                                                                              | **Procurement lead only; permission unverified.** Do not bundle data based on the “most datasets” statement. Retain the exact License Manager/order evidence for the chosen dataset and venue before publication.                                           |

## 3. Current bundling decision

No reviewed provider supplies a public, blanket grant that safely covers all of these required uses:

- committing recoverable OHLCV to the ChartPath repository;
- shipping the same values inside mobile and web application bundles;
- displaying them to unrelated end users, including offline;
- retaining them for the lifetime needed to reproduce saved attempts;
- preserving them after a subscription or order ends;
- applying the declared normalization/adjustment and displaying derived charts; and
- satisfying each exchange or original publisher’s terms.

Therefore:

1. No downloaded real candles, raw provider response, or provider credential may enter version
   control.
2. Tests and the core app must use a generated synthetic development fixture unless exact rights are
   later verified.
3. Provider-specific downloaders, if added, run outside the learner application. They are not a
   production dependency and never expose credentials in bundles, logs, screenshots, fixtures, or
   error messages.
4. Databento may be evaluated first in a future procurement process, but no data is included until
   the exact dataset record passes the evidence checklist below.
5. A private repository is not treated as a licensing exemption. Contributors, build systems,
   backups, artifacts, and future releases can all expand distribution or retention.

Paper-execution records inherit the exact dataset ID/version/checksum and scenario identity. If
rights are revoked, a dataset is withdrawn, or exact evidence is unavailable, resume fails closed;
the application must not retain a substitute candle set merely to preserve a simulated outcome.
Screenshots, exports and event logs containing recoverable real values are distribution and require
the same permission review as the underlying chart.

## 4. Evidence required before real-data publication

The retained evidence packet must identify the legal customer and exact dataset/version and contain:

- official source and terms URLs, reviewed date, and archived or versioned agreement reference;
- provider, original publisher/exchange, dataset/endpoint, symbol universe, and delayed age;
- permitted commercial and educational uses;
- express external-display, application-bundling, redistribution, and repository/build-artifact rights;
- local cache and long-term retention rights, including post-termination obligations;
- attribution, trademark, proprietary-notice, audit, reporting, and entitlement requirements;
- raw and derived-data restrictions, including chart display and normalized OHLCV;
- exchange/MIC, instrument, geographic, device, user-count, and white-label limitations;
- price/fees and renewal/termination owner; and
- an approval decision recorded by a responsible human reviewer.

Missing or conflicting evidence produces `unclear` or `blocked`, never `verified permission`.

## 5. Reverification and revocation

Provider terms must be rechecked before each dataset publication and whenever a provider, exchange,
plan, endpoint, use, audience, retention period, or distribution channel changes. The manifest keeps
the evidence review date and terms URL; credentials and confidential contract text remain outside the
learner bundle.

If rights expire, are revoked, or become uncertain, stop assigning the affected scenario to new
learners and stop distributing new builds containing the dataset. Preserve attempt integrity without
silently regrading prior work. Removal or continued archival must follow the governing agreement and
receive a documented migration/release decision.

The provider matrix is intentionally independent of educational source review. The full dual-source
and publication contract is defined in [HISTORICAL_DATA_SCHEMA.md](./HISTORICAL_DATA_SCHEMA.md).
