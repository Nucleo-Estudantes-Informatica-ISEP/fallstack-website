# Changelog

All notable per-edition changes to this project are documented here, in the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

This project ships once a year — one edition per Fallstack event — so entries are written by hand at each edition's cutover rather than generated from commit history. See `AGENTS.md`'s "Editions & releases" section for the tagging/versioning convention.

## [1.0.0] - 2025-11-25 - Fallstack 2025 Edition

The 2025 edition, held 24-25 November 2025 (the website only became reliably usable on the 25th, after fixing launch-day bugs from the first day). Tagged retroactively as the stable baseline `main` has stayed at since.

### Changed

- Consolidated onto a single persistent repo: the 2024 edition's repo was archived, and this repo was renamed from `fallstack2025` to `fallstack-website`.
- Removed the unused `firebase-admin` dependency.
- Routine dependency bumps (`lodash`, `react-easy-crop`, `axios`, `webpack`) — no functional changes.
