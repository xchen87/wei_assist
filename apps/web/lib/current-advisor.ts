/** Auth isn't wired up yet (see D-014) — every page in this build runs as
 * one hardcoded advisor. This is the single place that decides who that
 * is, so the stand-in session is one constant to delete when Auth.js
 * lands rather than a name typed into each surface that needs it. */
export const CURRENT_ADVISOR_NAME = "Dana Whitfield";
